// Applies db/schema.sql, loads the curriculum catalogue from ../seed, and
// Demo PDFs are opt-in so a fresh handoff starts with an empty library.
//
//   npm run db:setup          → schema + catalogue only
//   npm run db:setup -- --demo → schema + catalogue + demo files
//   npm run db:reset          → wipes the local PGlite directory first
//
// Storage backend:
//   DATABASE_URL set  → that Postgres (Neon/Supabase/local PG)
//   otherwise         → PGlite in .data/pg (no credentials, no Docker)

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, ".data");
const PG_DIR = path.join(DATA_DIR, "pg");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const SEED_DIR = path.join(ROOT, "..", "seed");

/* ------------------------------------------------------------------ env */
function loadEnvLocal() {
  try {
    const raw = readFileSync(path.join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, key, value] = m;
      if (!process.env[key]) process.env[key] = value.replace(/^["']|["']$/g, "");
    }
  } catch {}
}
loadEnvLocal();

/* ------------------------------------------------------------- connection */
async function connect() {
  if (process.env.DATABASE_URL) {
    const { Client } = await import("pg");
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    console.log("connected:", new URL(process.env.DATABASE_URL).host);
    return {
      query: (sql, params) => client.query(sql, params),
      exec: (sql) => client.query(sql),
      close: () => client.end(),
    };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  mkdirSync(DATA_DIR, { recursive: true });
  const db = new PGlite(PG_DIR);
  await db.waitReady;
  console.log("connected: local PGlite at .data/pg");
  return {
    query: (sql, params) => db.query(sql, params),
    exec: (sql) => db.exec(sql),
    close: () => db.close(),
  };
}

/* ----------------------------------------------------------------- helpers */
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function parseCsv(raw) {
  const [headerLine, ...lines] = raw.trim().split(/\r?\n/);
  const header = headerLine.split(",").map((h) => h.trim());
  return lines
    .filter((l) => l.trim())
    .map((line) => {
      const cells = line.split(",");
      const row = {};
      header.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
      return row;
    });
}

/* ------------------------------------------------- minimal PDF generator */
function makePdf(title, lines) {
  const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const body = [
    `BT /F1 20 Tf 72 760 Td (${esc(title)}) Tj ET`,
    `BT /F1 11 Tf 72 720 Td 18 TL ${lines.map((l) => `(${esc(l)}) Tj T*`).join(" ")} ET`,
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(body)} >>\nstream\n${body}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let out = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

/* ------------------------------------------------------------------- demo */
const DEMO = [
  ["NEU-205", "slides", "Cranial nerves — lecture deck", "Anatomy", null, "demo, not real course material"],
  ["NEU-205", "past_paper", "Final 2024 — MCQ paper", "Anatomy", 2024, "demo, not real course material"],
  ["NEU-205", "mcq", "Final 2023 — MCQ answer key", "Anatomy", 2023, "demo, not real course material"],
  ["NEU-205", "summary_note", "Neuro exam quick sheet", "Physiology", null, "demo, not real course material"],
  ["DIG-206", "slides", "GIT anatomy overview", "Anatomy", null, "demo, not real course material"],
  ["DIG-206", "past_paper", "Final 2024 — written paper", "Pathology", 2024, "demo, not real course material"],
  ["DIG-206", "summary_note", "Pharmacology of acid suppression", "Pharmacology", null, "demo, not real course material"],
  ["PAT-210", "summary_note", "General pathology — cell injury", "Pathology", null, "demo, not real course material"],
  ["PAT-210", "mcq", "MCQ bank 2024", "Pathology", 2024, "demo, not real course material"],
  ["PSY-213", "slides", "Introduction to behavioural science", "Behavioural science", null, "demo, not real course material"],
];

async function seedDemo(db) {
  const { rows: existing } = await db.query("select count(*)::int as n from resources");
  if (existing[0].n > 0) {
    console.log("resources already present — skipping demo files");
    return 0;
  }

  mkdirSync(UPLOAD_DIR, { recursive: true });
  let n = 0;
  for (const [code, type, title, subject, examYear, note] of DEMO) {
    const { rows: mods } = await db.query("select id from modules where code = $1", [code]);
    if (!mods.length) continue;
    const { rows: subs } = await db.query("select id from subjects where name = $1", [subject]);

    const id = randomUUID();
    const pdf = makePdf(title, [
      `Module: ${code}`,
      `Type: ${type.replace("_", " ")}`,
      "",
      "This is placeholder content generated by `npm run db:setup -- --demo`",
      "so the browse / search / download flow can be exercised.",
      "Replace it with real material from the admin console.",
      "",
      note,
    ]);
    const key = `${id}.pdf`;
    writeFileSync(path.join(UPLOAD_DIR, key), pdf);

    await db.query(
      `insert into resources
         (id, module_id, subject_id, title, description, type, exam_year,
          storage_key, mime, size_bytes, page_count, sha256, status,
          uploader_name, reviewer_name, downloads, is_demo, published_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'published',
               'demo seeder','demo seeder',$13,true, now() - ($14 || ' days')::interval)`,
      [
        id, mods[0].id, subs[0]?.id ?? null, title,
        `Demo ${type.replace("_", " ")} for ${code}.`,
        type, examYear, key, "application/pdf", pdf.length, 1,
        createHash("sha256").update(pdf).digest("hex"),
        10 + ((n * 7) % 40), String(n * 3),
      ]
    );

    // Unconfirmed subject mapping so the module page has filter chips to show.
    if (subs[0]) {
      await db.query(
        `insert into module_subjects (module_id, subject_id, confirmed)
         values ($1,$2,false) on conflict do nothing`,
        [mods[0].id, subs[0].id]
      );
    }
    n++;
  }
  return n;
}

/* ------------------------------------------------------------------- main */
const reset = process.argv.includes("--reset") || process.env.npm_lifecycle_event === "db:reset";
const withDemo = process.argv.includes("--demo");

if (reset) {
  if (process.env.DATABASE_URL) {
    console.error("Refusing to reset a remote DATABASE_URL. Drop the database yourself.");
    process.exit(1);
  }
  rmSync(PG_DIR, { recursive: true, force: true });
  rmSync(UPLOAD_DIR, { recursive: true, force: true });
  console.log("wiped .data/pg and .data/uploads");
}

const db = await connect();

try {
  await db.exec(readFileSync(path.join(ROOT, "db", "schema.sql"), "utf8"));
  console.log("schema applied");

  const catalog = JSON.parse(readFileSync(path.join(SEED_DIR, "catalog.json"), "utf8"));

  for (const b of catalog.batches) {
    await db.query(
      `insert into batches (label, started_year, is_active) values ($1,$2,true)
       on conflict (label) do update set started_year = excluded.started_year`,
      [b.label, b.started_year]
    );
  }

  for (const y of catalog.years) {
    const { rows } = await db.query(
      `insert into curriculum_years (program, year_no, label) values ($1,$2,$3)
       on conflict (program, year_no) do update set label = excluded.label
       returning id`,
      [catalog.program, y.year_no, y.label]
    );
    const yearId = rows[0].id;

    for (const m of y.modules) {
      await db.query(
        `insert into modules (code, slug, title, kind, curriculum_year_id, semester_no, position)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (code) do update set
           slug = excluded.slug,
           title = coalesce(modules.title, excluded.title),
           kind = excluded.kind,
           semester_no = coalesce(modules.semester_no, excluded.semester_no),
           position = excluded.position,
           curriculum_year_id = excluded.curriculum_year_id`,
        [m.code, slugify(m.code), m.title, m.kind, yearId, m.semester_hint ?? null, m.position]
      );
    }

    for (const [i, s] of y.subjects.entries()) {
      await db.query(
        `insert into subjects (name, slug) values ($1,$2) on conflict (name) do nothing`,
        [s.name, s.slug]
      );
    }
  }
  console.log("catalogue loaded");

  const { rows: years } = await db.query("select id from curriculum_years");
  for (const b of catalog.batches) {
    const { rows: bid } = await db.query("select id from batches where label = $1", [b.label]);
    for (const y of years) {
      for (const sem of catalog.semesters) {
        await db.query(
          `insert into terms (batch_id, curriculum_year_id, semester_no)
           values ($1,$2,$3) on conflict do nothing`,
          [bid[0].id, y.id, sem]
        );
      }
    }
  }

  const mappingPath = path.join(SEED_DIR, "module_subjects.csv");
  let mapped = 0;
  if (existsSync(mappingPath)) {
    for (const row of parseCsv(readFileSync(mappingPath, "utf8"))) {
      const slugs = (row.subject_slugs || "").split(/[;|]/).map((s) => s.trim()).filter(Boolean);
      if (!slugs.length) continue;
      const { rows: mods } = await db.query("select id from modules where code = $1", [row.module_code]);
      if (!mods.length) continue;
      for (const slug of slugs) {
        const { rows: subs } = await db.query("select id from subjects where slug = $1", [slug]);
        if (!subs.length) continue;
        await db.query(
          `insert into module_subjects (module_id, subject_id, confirmed)
           values ($1,$2,$3) on conflict (module_id, subject_id)
           do update set confirmed = excluded.confirmed`,
          [mods[0].id, subs[0].id, row.confirmed === "y"]
        );
        mapped++;
      }
    }
  }
  console.log(`module↔subject mappings: ${mapped}`);

  const demoCount = withDemo ? await seedDemo(db) : 0;
  if (withDemo) console.log(`demo resources: ${demoCount}`);

  const { rows: summary } = await db.query(
    `select
       (select count(*)::int from modules)   as modules,
       (select count(*)::int from subjects)  as subjects,
       (select count(*)::int from resources where status = 'published') as published,
       (select count(*)::int from resources where status = 'pending_review') as pending`
  );
  console.log(
    `ready — ${summary[0].modules} modules, ${summary[0].subjects} subjects, ` +
      `${summary[0].published} published, ${summary[0].pending} pending review`
  );
} catch (err) {
  console.error("\nsetup failed:", err.message);
  process.exitCode = 1;
} finally {
  await db.close();
}

import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { isAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { RESOURCE_TYPES, type ResourceType } from "@/lib/queries";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

function back(request: Request, key: "error" | "uploaded", value: string) {
  return NextResponse.redirect(
    new URL(`/admin?${key}=${encodeURIComponent(value)}`, request.url),
    { status: 303 }
  );
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.redirect(new URL("/admin/login", request.url), { status: 303 });
  }

  const form = await request.formData();

  const moduleId = Number(form.get("module_id"));
  const type = String(form.get("type") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const examYearRaw = String(form.get("exam_year") ?? "").trim();
  const subjectIdRaw = String(form.get("subject_id") ?? "").trim();
  const publish = form.get("publish") === "1";
  const file = form.get("file");

  if (!moduleId) return back(request, "error", "Pick a module.");
  if (!title) return back(request, "error", "Title is required.");
  if (!(RESOURCE_TYPES as string[]).includes(type)) {
    return back(request, "error", "Unknown resource type.");
  }
  if (!(file instanceof File) || file.size === 0) {
    return back(request, "error", "Attach a PDF.");
  }
  if (file.size > MAX_BYTES) {
    return back(request, "error", "File is larger than 25 MB.");
  }
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return back(request, "error", "Only PDF files are accepted for now.");

  const examYear = examYearRaw ? Number(examYearRaw) : null;
  if (examYear !== null && (!Number.isInteger(examYear) || examYear < 1980 || examYear > 2100)) {
    return back(request, "error", "Exam year looks wrong.");
  }
  const subjectId = subjectIdRaw ? Number(subjectIdRaw) : null;

  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  const [duplicate] = await q<{ id: string }>(
    `select id from resources where sha256 = $1 and status <> 'rejected' limit 1`,
    [sha256]
  );
  if (duplicate) {
    return back(request, "error", `Duplicate — already in the library at /r/${duplicate.id}`);
  }

  const [module] = await q<{ id: number }>(`select id from modules where id = $1`, [moduleId]);
  if (!module) return back(request, "error", "That module does not exist.");

  const id = randomUUID();
  const storageKey = `${id}.pdf`;
  const pageCount = Math.max(1, (bytes.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length);

  await mkdir(UPLOAD_DIR, { recursive: true });
  const fullPath = path.join(UPLOAD_DIR, storageKey);
  await writeFile(fullPath, bytes);

  try {
    await q(
      `insert into resources
         (id, module_id, subject_id, title, type, exam_year, storage_key, mime,
          size_bytes, page_count, sha256, status, uploader_name, published_at)
       values ($1,$2,$3,$4,$5,$6,$7,'application/pdf',$8,$9,$10,$11,'admin',
               case when $12::boolean then now() else null end)`,
      [
        id,
        moduleId,
        subjectId,
        title,
        type as ResourceType,
        examYear,
        storageKey,
        bytes.length,
        pageCount,
        sha256,
        publish ? "published" : "pending_review",
        publish,
      ]
    );
  } catch (err) {
    await unlink(fullPath).catch(() => {});
    return back(request, "error", `Could not save: ${(err as Error).message}`);
  }

  return publish
    ? NextResponse.redirect(new URL(`/r/${id}`, request.url), { status: 303 })
    : back(request, "uploaded", "1");
}

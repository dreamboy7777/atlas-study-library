# Atlas — Next.js prototype (optional)

A working, runnable slice of the plan in [`../ACTION_PLAN.md`](../ACTION_PLAN.md):
catalogue → module pages → search → resource page → download → admin upload/review.

The handoff app is the single file [`../atlas.html`](../atlas.html). This Next.js
prototype is kept for reference and for anyone who wants a server-backed version.

No accounts, no cloud accounts, no Docker. One command to load the data, one to run.

---

## Quick start

```bash
npm install
npm run db:setup     # schema + curriculum (empty library)
npm run dev          # http://localhost:3000
```

Admin console: <http://localhost:3000/admin> — passcode **`kellyisthecutest`**
(override with `ADMIN_PASSCODE` in `.env.local`).

```bash
npm run db:reset              # wipe local DB + uploads, then reload the catalogue
npm run db:setup:demo         # catalogue plus the optional demo PDFs
npm run typecheck
```

## What works

| Flow | Where |
|---|---|
| Pick batch / year / semester | `/` |
| Browse modules with live file counts | `/` |
| Filter by resource type + subject | `/m/[slug]` |
| Search titles, module codes, topic words | `/search?q=…` |
| Preview, download (counted), share link | `/r/[id]` |
| Report a broken / misplaced / infringing file | `/r/[id]` → report form |
| Upload PDF, review queue, approve / reject / unpublish | `/admin` |
| Duplicate rejection by SHA-256 | `/admin` upload |

## Stack and why

- **Next.js 16 (App Router) + React 19 + Tailwind 4** — one codebase gives installable web, server-rendered pages that work on a 3G Android, and plain `<form>` admin flows with no client state to maintain.
- **PostgreSQL** as the only datastore. Locally that is **PGlite** (Postgres compiled to WASM, persisted in `.data/pg`), so `npm i && npm run db:setup` works with zero credentials and zero Docker. Set `DATABASE_URL` and the exact same SQL runs on Neon/Supabase — no dialect rewrite.
- **Files on disk** (`.data/uploads`) behind `/api/download/:id`, which is the local stand-in for a signed R2 URL. Swap one route for `302 → signed URL` in production.

## Two environment gotchas (already handled, but worth knowing)

1. **Scripts use `--webpack`.** Turbopack refuses to create its lockfile when the project
   path contains a space (`C:\…\Default Project\…` → `os error 2`, and the dev server then
   accepts connections but never answers). Webpack has no such problem. Move the project to
   a path without spaces and you can drop the flag.
2. **`serverExternalPackages: ["@electric-sql/pglite", "pg"]`** in `next.config.ts`. PGlite
   resolves its WASM files relative to its own package; bundled, it throws
   `path must be of type string … Received an instance of URL`.

`GET /api/health` returns the DB engine and query latency — useful when a page hangs.

## Layout
```
web/
  db/schema.sql            # Postgres DDL, idempotent
  scripts/setup-db.mjs     # migrations + catalogue import + demo PDFs
  src/lib/db.ts            # PGlite / pg connection, one per process
  src/lib/queries.ts       # every SQL read, in one file
  src/lib/auth.ts          # passcode → hashed cookie (dev-grade)
  src/app/page.tsx         # my semester → module grid
  src/app/m/[slug]/        # module page, type + subject filters
  src/app/r/[id]/          # resource page, preview, download, report
  src/app/search/          # full-text + ILIKE search
  src/app/admin/           # upload, queue, published, reports
  src/app/api/             # download, inline file, report, admin actions
```

## Data

Curriculum comes from `../seed/catalog.json` (batches, years, modules, subjects).
Module → subject mappings come from `../seed/module_subjects.csv` and are **empty on
purpose** — the mapping was never in the outline. Rows you fill in get
`confirmed = y`; the module page shows *unconfirmed* mapping as a hint rather than
pretending the filter is authoritative.

Demo resources are opt-in with `npm run db:setup:demo`; they are one-page PDFs
flagged `is_demo = true` and badged **DEMO** in the UI. A normal `npm run db:setup`
starts with an empty library.

## Deliberate gaps (next, in order)

1. **Real auth** — replace the passcode cookie with magic-link auth and a `profiles` table; move uploads to `contributor` role so students can queue files.
2. **Object storage** — R2 bucket + signed URLs; delete the disk read in `/api/download`.
3. **Semester mapping** — fill `semester_hint` per module in `catalog.json`, then the semester chips on `/` actually narrow.
4. **PDF preview on mobile** — the `<iframe>` preview is fine on desktop Chrome, patchy on iOS Safari; fall back to a download CTA there.
5. **Pilot telemetry** — the `events` table already records downloads, reports and searches; add a zero-result-search report before launch.
6. **Legal** — takedown form, uploader identity, "no textbooks" policy. The report queue exists; the policy page does not.

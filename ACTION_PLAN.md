# Atlas — Action Plan

**Version:** 0.1 (draft) · **Date:** 22 Oct 2026
**Goal:** a centralized, low-clutter library where junior students find a slide deck, past paper, MCQ set or summary note in under 20 seconds — and share a clean link instead of a 400 MB Telegram zip.

---

## 0. Implementation status (scaffold, 22 Oct 2026)

[`web/`](web/) is a runnable Next.js + Postgres app covering P1–P3 below.

| Phase | Status | Notes |
|---|---|---|
| P0 content audit | **not started** | needs your 60 real files and the module→subject mapping |
| P1 data spine | **done (local)** | schema, seed import, upload, publish, hash dedupe |
| P2 student UX | **done** | term picker, module pages, type/subject filters, search, resource page, counted downloads, share link |
| P3 accounts & trust | **partial** | passcode admin + review queue + reports + analytics events; real student auth not built |
| P4 Telegram intake | **not started** | bot grammar is specified in §8 |
| P5 pilot | **not started** | — |

Gaps are listed at the bottom of [`web/README.md`](web/README.md).

## 1. The problem, stated precisely

Telegram is a good *transport* and a terrible *library*. Files are:

- **unfindable** — no titles, no module codes, no exam year, just `IMG_20240311_2211.pdf` and 8 000 messages of scroll;
- **duplicated** — the same paper re-uploaded 6 times, sometimes truncated;
- **unordered** — no batch / year / semester / module structure;
- **disappearing** — channel admins rotate, old files get buried, links die.

So the product is not "a nicer Telegram". It is **a catalog with a search box and a stable URL per resource**, plus a light intake pipe so content can keep arriving from Telegram.

## 2. Definition of done for MVP

> A Batch-199 student opens the app, lands on Year 2, taps **NEU-205**, sees `Past papers`, picks *Final 2024*, and downloads it — in ≤ 3 taps or 1 search, on a mid-range Android phone over 3G.

Explicit **non-goals for v1** (each one is a month of work and none of them is the reason students will use this):

- chat / comments / DMs
- video hosting (link out to YouTube/Drive instead)
- AI tutor, quiz engine, flashcard SRS
- ratings, likes, social feed
- native iOS/Android store apps (PWA install covers 95% of the need)

## 3. Product decisions to lock before writing code

| # | Decision | Choice | Why |
|---|---|---|---|
| D1 | Platform | **Web-first PWA** (Next.js), installable, works offline-ish | One codebase, instant shareable links, no app-store review, no 2-week release cycle. Wrap with Capacitor later only if push notifications become essential. |
| D2 | Interaction model | **Search-first, browse-second** | The pain is "I can't find it", not "I want to explore". Home = *my semester*, not a feed. |
| D3 | Who can publish | Students **upload → moderation queue → published** | Unmoderated uploads become a second Telegram within a month. |
| D4 | Single source of truth | One canonical record per file (hash-deduped). Telegram becomes an **intake channel**, not the library. | Kills duplicate drift permanently. |
| D5 | Storage split | Metadata in Postgres, **files in object storage + CDN** (Cloudflare R2) | DB stays small/backup-able; egress is free; signed URLs stop hotlinking. |
| D6 | Taxonomy | Fixed 4-tier spine + **subject as a facet, not a folder** | See §4 — this is the single most important design call. |

## 4. Information architecture — fixing the "two Level 2s"

Your draft numbers both *modules* and *subjects* as "level 2". They can't both be a tree level, because **Anatomy, Physiology and Biochemistry appear inside almost every module**. If you nest them, `Neurology → Anatomy` and `Anatomy → Neurology` both become "correct" and the catalog rots.

Correct model:

| Level | Entity | Cardinality | Example |
|---|---|---|---|
| L0 | **Batch** | 1 per student cohort | `Batch 199` |
| L1 | **Term** = Batch × Year × Semester | 1 active per student | `Batch 199 · Year 2 · Sem 1` |
| L2 | **Module** (horizontal / vertical) | many per year | `NEU-205` |
| L3 | **Subject** (facet, many-to-many) | many per module | `Anatomy`, `Physiology` |
| L4 | **Resource** (file + metadata) | many per module | `NEU-205 Final 2024 MCQs` |

Rules that follow from this:

1. **Modules belong to a year, not a semester.** Your outline groups them per year ("FIRST YEAR HORIZONTAL MODULES"). A module can optionally carry a `semester_no` hint for navigation, but the resource record does not depend on it.
2. **Subjects are tags.** Never build URLs like `/anatomy/neu-205`. Build `/b/199/y2/neu-205?subject=anatomy`.
3. **A resource's home is exactly one module.** If a file genuinely covers two modules, pick the primary one and cross-link the second (`related_module_ids`). One canonical location, always.
4. **Horizontal vs vertical modules is a badge, not a separate silo.** Students don't think "let me browse vertical modules"; they think "where is EPE". Show the badge, filter by it, but keep one module list.

### URL scheme (stable, shareable, SEO-free)

```
/                          → redirect to /b/{my batch}/y{n}/{sem}
/b/199/y2/s1               → "My semester" module grid
/b/199/y2/neu-205          → module page: resources grouped by type
/b/199/y2/neu-205?type=past_paper&subject=anatomy
/r/{resourceId}            → canonical resource page + download + share card
/s?q=neu+final+2024        → search results
```

## 5. MVP screens (7 — do not add an 8th)

1. **Onboarding (one-time, 1 screen):** pick Batch → Year → Semester. Saved in localStorage + profile. Skippable; every screen still works without it.
2. **My semester (home):** module cards with resource counts, type chips, global search bar pinned at top, "Recently added" strip (max 6).
3. **Module page:** header (code, title, horizontal/vertical badge), **type tabs** (Slides · Past papers · MCQs · Notes · All), subject filter chips, list of resource rows.
4. **Resource page:** title, module, subject tags, exam year, pages, size, uploader, **Download** (signed URL), **Save**, **Share** (copy link / WhatsApp), **Report**.
5. **Search:** instant results (debounced 200 ms), matches title + module code + subject + tags; empty state offers "browse by module".
6. **Saved / offline:** bookmarked resources, cached PDF pages.
7. **Admin console:** upload (drag-drop), bulk import CSV, pending queue (approve/reject/edit metadata), duplicate detector, report queue. Role-gated.

**Resource row anatomy** (this is the whole UX — get it right):
`[TYPE BADGE] Title  ·  NEU-205 · 12 pages · 2.1 MB · 2024` → tap to open, `⤓` to download, `☆` to save.

## 6. Phases

| Phase | Duration | Output | "Done when" |
|---|---|---|---|
| **P0 — Content audit** | 3–4 days | 60 real files collected from 2 modules, catalogued in a spreadsheet; module→subject mapping confirmed with a batch rep; file naming convention agreed | You can answer "how many past papers does NEU-205 have?" from the sheet |
| **P1 — Data spine** | 1 week | Postgres schema, storage bucket, admin upload + publish, module pages rendering real data | An admin uploads a PDF and it appears on the module page in < 60 s |
| **P2 — Student UX** | 1 week | Home, module page, resource page, search, share links | A student finds a known file in < 20 s without instructions |
| **P3 — Accounts & trust** | 4–5 days | Auth, roles, moderation queue, reports, analytics events | Every published file has a named approver; reports land in a queue |
| **P4 — Telegram intake** | 4–5 days | Bot that ingests forwarded files into the review queue with parsed metadata + hash dedupe | Forwarding a file to the bot creates a *pending* resource, no manual upload |
| **P5 — Pilot** | 1 week | PWA install, offline cache, 10–20 real students from one module | ≥ 60% of pilot users return in week 2 |
| **P6 — Scale** | ongoing | Multi-batch, exam mode, OCR full-text, push notifications, optional native wrapper | — |

**Total to pilot: ~5 weeks of part-time work.** Resist compressing P0; every catalog built on guessed metadata gets rebuilt.

## 7. Backlog (sprint-ready)

### P0 — Content audit
- [ ] Export 2 modules' files out of Telegram (desktop client → save by date range)
- [ ] Fill `seed/catalog.json` gaps (module titles, semester placement)
- [ ] Fill `seed/module_subjects.csv` — one row per module × subject, `confirmed = y/n`
- [ ] Count per type: slides / past papers / MCQ / notes, per module
- [ ] Define naming convention (below) and rename the 60 audit files with it
- [ ] Recruit 1 moderator per batch

### P1 — Data spine
- [ ] `create table` all entities from `DATA_MODEL.md`; apply RLS
- [ ] R2 bucket + Supabase signed URL function (`/api/download/:id` logs the event then 302s)
- [ ] Admin: upload form with **required** module + type + title, optional exam year/subjects
- [ ] Auto-extract page count, size, sha256 on upload
- [ ] Publish action flips `status` and stamps `published_at`
- [ ] Seed `catalog.json` into DB (idempotent upsert by natural key)
- [ ] Module page server-rendered from DB, cached 60 s

### P2 — Student UX
- [ ] Onboarding + localStorage term, `/` redirect logic
- [ ] Module grid with counts, horizontal/vertical badge
- [ ] Type tabs + subject chips on module page
- [ ] Resource row + resource page + share card (OG image with module code)
- [ ] `pg_trgm` + `tsvector` search with debounce, keyboard/`/` shortcut
- [ ] Empty, loading and dead-link states; "this file is missing → report" flow
- [ ] Mobile: 360 px width pass, tap targets ≥ 44 px, list virtualization if > 200 rows

### P3 — Trust
- [ ] Auth (magic link or Google; phone OTP is expensive and flaky)
- [ ] Roles: student / contributor / moderator / admin
- [ ] Pending queue UI with side-by-side PDF preview + metadata form
- [ ] Reports → moderation actions (hide, replace, delete, takedown)
- [ ] `events` table: `view`, `download`, `search`, `report` — no PII beyond user id
- [ ] Audit log for publish/delete

### P4 — Telegram intake
- [ ] Bot in a private intake group; command/hashtag grammar (below)
- [ ] Download file → sha256 → reject duplicate / attach as new version
- [ ] Parse caption into draft metadata → review queue with confidence flags
- [ ] Moderator one-tap approve in the queue (not in Telegram — keep one console)

### P5 — Pilot
- [ ] `manifest.json`, service worker, install prompt, offline shell
- [ ] Lighthouse ≥ 90 perf, ≥ 95 a11y on a throttled profile
- [ ] Analytics dashboard: top searches with **zero clicks** (this is your content gap list)
- [ ] Feedback button → single Google Form, not a feature
- [ ] Recruit 20 students, watch 5 of them use it silently (no help)

## 8. Content pipeline (Telegram → library)

**Naming convention** — enforced by the upload form, applied by bot:
`{YEAR}_{MODULE}_{SUBJECT}_{TYPE}_{EXAMYEAR}_{TitleSlug}.pdf`
e.g. `Y2_NEU-205_Anatomy_PastPaper_2024_Final-MCQ.pdf`

**Bot grammar** (caption on the forwarded file):
```
#NEU-205 #pastpaper #2024 #anatomy
Final MCQ 2024 (with answer key)
```
- Module code is mandatory; unknown code → bot replies with the 3 closest matches.
- Missing type/year → goes to queue with `needs_metadata = true`, still stored.
- Duplicate hash → bot replies "already in library: /r/abc123".

**Dedupe strategy:** exact `sha256` (blocks re-uploads) + optional perceptual check on first page (catches re-scans) — post-MVP.

**Bulk path:** admin CSV import for the initial 500–1 000 files; bot handles steady-state trickle.

## 9. Roles & governance

| Role | Can | Who |
|---|---|---|
| Student | browse, search, download, save, report | everyone (browse is public; download may require login) |
| Contributor | upload → pending queue | willing classmates |
| Moderator | approve/reject/edit metadata, resolve reports | **1 per batch**, named publicly |
| Admin | everything + users + modules + takedowns | you |

Governance rules that prevent the usual failure modes:
- **One owner per batch.** No owner → that batch never gets content.
- **Publish requires a named human.** No auto-publish, ever.
- **Takedown SLA 48 h.** Copyright complaints get a form and a real deadline.
- **Version, don't overwrite.** A "corrected" file becomes v2 of the same resource (previous version retained but hidden).

## 10. Cost plan (realistic, first 1 000 files)

| Item | Choice | Cost |
|---|---|---|
| DB + Auth | Supabase Free (500 MB DB) | $0 — metadata is tiny; 1 000 rows ≈ 15 MB |
| Files | Cloudflare R2 (10 GB free, then $0.015/GB-mo, **$0 egress**) | $0 at 2 GB avg × 1 000 ≈ 2 GB |
| Hosting | Vercel Hobby / Cloudflare Pages | $0 |
| Domain | `.com` or `.app` | ~$12/yr |
| OCR (P6) | on-demand, batch, local Tesseract first | $0 initially |
| **Total to pilot** | | **~$12/year** |

Scaling worry is bandwidth, not storage — R2's zero egress is why it beats Supabase Storage (which charges $0.09/GB egress) for a link-heavy student app.

## 11. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Copyright** — hosting paid textbooks / lecturer-owned slides | High | Legal takedown, app killed | ToS: student-authored notes + institutional slides only; takedown form; no textbook PDFs; log uploader |
| Content never gets uploaded (empty app) | High | Fatal | P0 audit *before* coding; seed 500 files yourself; 1 owner per batch |
| Moderator burnout | Medium | Queue rot | Bulk approve, duplicate auto-detect, 10-min/day target, rotate per semester |
| Module→subject mapping wrong | High | Search feels broken | Mapping is data, not code — editable in admin; unconfirmed rows flagged in UI as "all subjects" |
| Batch-specific files confuse juniors | Medium | Wrong exam prep | `audience_batch` field; show "for Batch 200" chip; default to batch-agnostic resources first |
| Dead links / missing files | Medium | Trust loss | Files in own storage (never link to Drive), quarterly link check, report button |
| Exam-season traffic spike | Medium | Slow/failed downloads | CDN + signed URLs + cache headers; never stream PDFs through your own server |
| Two students build two apps | Medium | Split audience | Publish the catalog as CSV/JSON openly — the data is the moat, not the UI |

## 12. Metrics (instrument from day one)

- **North star:** weekly active students who downloaded ≥ 1 resource.
- **Time-to-find:** median seconds from home to download (target < 20 s).
- **Search success rate:** % of searches with a click (target > 70%).
- **Zero-result searches** — top 20 weekly → your content backlog.
- **Coverage:** % of modules with ≥ 1 past paper and ≥ 1 slide deck (target 100% before pilot).
- **Freshness:** days since last publish per active module.
- **Trust:** report rate per 1 000 downloads (< 2), dead-file rate (< 2%).

## 13. Open questions (answer before P1)

1. **Which semester does each module sit in?** The outline gives modules per *year* only. Needed for "My semester" home. (Can ship year-level home first, but plan the field.)
2. **Module → subject mapping** — who signs off? Faculty list, or batch rep consensus? (`seed/module_subjects.csv` is the artifact.)
3. **What is EPE / MPE / RES-234 in full?** Titles show in the UI; placeholders look unprofessional.
4. **Login required for download, or fully open?** Open = adoption, closed = accountability + analytics. Recommended: browse open, download after one-tap magic link.
5. **Are Batch 198/199 files still relevant to Batch 200?** Determines whether content is per-batch or per-curriculum (default: per-curriculum, batch as a filter).

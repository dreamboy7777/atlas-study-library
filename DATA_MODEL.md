# Atlas — Data Model

Postgres (Supabase). Files live in Cloudflare R2; only metadata lives here.

> Implemented in [`web/db/schema.sql`](web/db/schema.sql). The DDL below is the
> production shape; the scaffold drops Supabase-specific auth FKs and uses text
> roles instead.

---

## 1. Entity map

```
batches ──< terms >── curriculum_years ──< modules ──< module_subjects >── subjects
   │                        │                 │
   │                        └──< modules      └──< resources ──< saves
   │                                              │  ├──< reports
   └──────────────< profiles (batch)              │  └──< events
                                                  └──< resource_versions
```

Key rules:

- `modules` attach to a **curriculum year** (`curriculum_years`), not to a batch. Every batch studies the same NEU-205 when it reaches Year 2; Year 3 modules (INF-309 … MPC-326) carry a `semester_no` of 1 or 2.
- `terms` are the join of *batch × year × semester* — a student's current position.
- In the single-file build, each local account stores `batch` + `year`. Access is by batch: **198 → Years 1–3**, **199 → Years 1–2**, **200 → Year 1**. Students can browse every year their batch is allowed; admins see all. The year selector only lists the selected batch's years.
- `subjects` are a **facet** joined many-to-many. A resource may carry 0..n subjects.
- A resource belongs to **exactly one module** (`module_id NOT NULL`), plus optional `related_module_ids` for genuine overlap.
- A resource may be **batch-specific** (`audience_batch_id`) — e.g. "Batch 200 midterm". NULL means all batches.
- Two different subject links, deliberately:
  - `module_subjects` — which subjects a **module** covers (drives the filter chips: "NEU-205 covers Anatomy, Physiology…").
  - `resources.subject_id` — which subject **one file** is about (a specific PDF is Anatomy, not Physiology).
  Both are needed; `module_subjects.confirmed = false` means the mapping is a guess, and the UI says so instead of hiding files under a wrong filter.

## 2. Enums

| Enum | Values |
|---|---|
| `module_kind` | `horizontal`, `vertical` |
| `resource_type` | `slides`, `past_paper`, `mcq`, `summary_note`, `syllabus`, `practical_guide`, `reference`, `video_link` |
| `resource_status` | `draft`, `pending_review`, `published`, `rejected`, `archived` |
| `user_role` | `student`, `contributor`, `moderator`, `admin` |
| `event_kind` | `view`, `download`, `search`, `report`, `share` |
| `report_reason` | `broken_file`, `wrong_module`, `duplicate`, `copyright`, `low_quality`, `other` |

## 3. DDL

```sql
create extension if not exists pg_trgm;

create type module_kind     as enum ('horizontal','vertical');
create type resource_type   as enum ('slides','past_paper','mcq','summary_note',
                                     'syllabus','practical_guide','reference','video_link');
create type resource_status as enum ('draft','pending_review','published','rejected','archived');
create type user_role       as enum ('student','contributor','moderator','admin');
create type event_kind      as enum ('view','download','search','report','share');
create type report_reason   as enum ('broken_file','wrong_module','duplicate',
                                     'copyright','low_quality','other');

-- ── L0 / L1 ────────────────────────────────────────────────────────────────
create table batches (
  id            bigserial primary key,
  label         text not null unique,          -- '199', '200'
  started_year  int,
  is_active     boolean not null default true
);

create table curriculum_years (
  id        bigserial primary key,
  program   text not null default 'MBBS',
  year_no   int  not null check (year_no between 1 and 6),
  label     text not null,                      -- 'Year 1'
  unique (program, year_no)
);

create table terms (
  id                 bigserial primary key,
  batch_id           bigint not null references batches(id) on delete cascade,
  curriculum_year_id bigint not null references curriculum_years(id),
  semester_no        int not null check (semester_no in (1,2)),
  unique (batch_id, curriculum_year_id, semester_no)
);

-- ── L2 modules ─────────────────────────────────────────────────────────────
create table modules (
  id                 bigserial primary key,
  code               text not null unique,      -- 'NEU-205', 'EPE-2'
  title              text,                      -- nullable until confirmed
  kind               module_kind not null default 'horizontal',
  curriculum_year_id bigint not null references curriculum_years(id),
  semester_no        int check (semester_no in (1,2)),   -- navigation hint, optional
  position           int  not null default 0,   -- display order
  is_active          boolean not null default true,
  created_at         timestamptz not null default now()
);
create index on modules (curriculum_year_id, position);

-- ── L3 subjects (facets) ───────────────────────────────────────────────────
create table subjects (
  id   bigserial primary key,
  name text not null unique,      -- 'Anatomy'  (global: same entity in both years)
  slug text not null unique       -- 'anatomy'
);

create table module_subjects (
  module_id  bigint not null references modules(id) on delete cascade,
  subject_id bigint not null references subjects(id) on delete cascade,
  confirmed  boolean not null default false,    -- false → UI treats module as 'all subjects'
  primary key (module_id, subject_id)
);
create index on module_subjects (subject_id);

-- ── L4 resources ───────────────────────────────────────────────────────────
create table resources (
  id               uuid primary key default gen_random_uuid(),
  module_id        bigint not null references modules(id),
  subject_id       bigint references subjects(id) on delete set null,  -- primary subject of THIS file
  title            text not null,               -- 'Final MCQ 2024 (with answer key)'
  description      text,
  type             resource_type not null,
  exam_year        int  check (exam_year between 1980 and 2100),
  audience_batch_id bigint references batches(id),      -- null = all batches
  related_module_ids bigint[] not null default '{}',

  -- file facts (filled by the upload worker)
  storage_key      text,                        -- r2 key; null for video_link
  external_url     text,                        -- for video_link / reference
  mime             text,
  size_bytes       bigint,
  page_count       int,
  sha256           text unique,                 -- exact-duplicate gate
  language         text default 'en',

  status           resource_status not null default 'pending_review',
  needs_metadata   boolean not null default false,
  search_text      text,                        -- denormalized, refreshed by trigger

  uploader_id      uuid references auth.users(id),
  reviewer_id      uuid references auth.users(id),
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  downloads        int  not null default 0,

  -- exactly one file source
  constraint one_source check (
    (storage_key is not null)::int + (external_url is not null)::int = 1
  )
);

create index on resources (module_id, type) where status = 'published';
create index on resources (status) where status in ('pending_review','draft');
create index on resources (published_at desc) where status = 'published';
create index on resources (exam_year desc);
create index resources_search_gin on resources
  using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'')));
create index resources_title_trgm on resources using gin (title gin_trgm_ops);

-- ── users ──────────────────────────────────────────────────────────────────
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role        user_role not null default 'student',
  batch_id    bigint references batches(id),
  term_id     bigint references terms(id),
  created_at  timestamptz not null default now()
);

-- ── engagement ─────────────────────────────────────────────────────────────
create table saves (
  user_id     uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references resources(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, resource_id)
);

create table reports (
  id          bigserial primary key,
  resource_id uuid not null references resources(id) on delete cascade,
  reporter_id uuid references auth.users(id),
  reason      report_reason not null,
  detail      text,
  status      text not null default 'open',     -- open | resolved | dismissed
  resolved_by uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

-- anonymous-friendly analytics; no PII beyond user_id when logged in
create table events (
  id          bigserial primary key,
  user_id     uuid,
  resource_id uuid,
  kind        event_kind not null,
  query       text,                              -- for kind='search'
  session_id  text,                              -- anonymous dedupe
  created_at  timestamptz not null default now()
);
create index on events (created_at desc);
create index on events (kind, created_at desc);
```

`search_text` and `updated_at` are maintained by a small trigger (or by the API layer if you prefer no triggers):

```sql
create or replace function resources_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.search_text := concat_ws(' ', new.title, new.description);
  return new;
end $$;

create trigger resources_touch before insert or update on resources
for each row execute function resources_touch();
```

## 4. Row-level security (the short version)

```sql
alter table resources enable row level security;

-- anyone may read published rows
create policy "public read published" on resources
  for select using (status = 'published');

-- logged-in users may create drafts; they cannot publish themselves
create policy "authenticated insert draft" on resources
  for insert to authenticated
  with check (status in ('draft','pending_review') and auth.uid() = uploader_id);

-- only staff may modify/see the queue
create policy "staff write" on resources
  for all to authenticated
  using (exists (select 1 from profiles p
                 where p.id = auth.uid() and p.role in ('moderator','admin')));
```

Mirror the `staff write` pattern on `modules`, `subjects`, `module_subjects`, `reports`.
`events` accepts inserts from `anon` (search telemetry) but is only readable by staff.

## 5. Storage & downloads

- Bucket `materials`, **private**. Path: `{year}/{moduleCode}/{resourceId}/{filename}.pdf`.
- Client never sees a raw R2 URL. Flow:
  1. `GET /api/download/:id` → verify `status='published'` → insert `events(kind='download')` → `resources.downloads += 1`
  2. respond `302` to a **5-minute signed URL**
- PDFs served with `Content-Disposition: inline`, `Cache-Control: public, max-age=31536000, immutable` (keys are content-addressed by resource version).
- Upload worker computes `sha256`, `size_bytes`, `page_count` before insert; duplicate hash → 409 + link to existing resource.

## 6. Search query

```sql
select r.id, r.title, r.type, m.code as module_code,
       ts_rank(to_tsvector('simple', coalesce(r.title,'') || ' ' || coalesce(r.description,'')),
               websearch_to_tsquery('simple', $1)) as rank
from resources r
join modules m on m.id = r.module_id
where r.status = 'published'
  and (
    to_tsvector('simple', coalesce(r.title,'') || ' ' || coalesce(r.description,''))
      @@ websearch_to_tsquery('simple', $1)
    or m.code ilike '%' || $1 || '%'
    or r.title % $1                       -- trigram, handles typos
  )
order by rank desc, r.published_at desc
limit 30;
```

Add `and m.id = any($2)` when the query is scoped to a module. Ranking tie-breaker: `downloads desc` beats `published_at` once you have traffic.

## 7. Seed strategy

1. Import `seed/catalog.json` → upsert `batches`, `curriculum_years`, `terms`, `modules`, `subjects` by natural key (`label`, `code`, `name`). Idempotent, safe to re-run.
2. Import `seed/module_subjects.csv` → `module_subjects`. Rows with `confirmed = y` get `confirmed = true`; the rest `false` so the UI degrades to "all subjects" instead of showing a wrong filter.
3. Never seed resources from a script — they go through the upload path so hashes and page counts are real.

**Gap to close before P1:** `catalog.json` currently has `title: null` for every coded module (the outline only supplies codes) and `module_subjects.csv` has an empty `subject_slugs` column. Both are intentional — they are the two facts only your faculty/batch rep can confirm.

## 8. Naming convention (enforced on upload)

```
{YEAR}_{MODULE}_{SUBJECT}_{TYPE}_{EXAMYEAR}_{TitleSlug}.pdf
Y2_NEU-205_Anatomy_PastPaper_2024_Final-MCQ.pdf
```

Used for the storage key and the download filename. The DB `title` stays human-readable; the filename is machine-sortable so an offline folder still makes sense.

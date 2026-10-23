-- StudyHub schema — Postgres 15+ (runs on PGlite locally, Neon/Supabase in production).
-- Idempotent: safe to re-run.

create table if not exists batches (
  id           serial primary key,
  label        text not null unique,
  started_year int,
  is_active    boolean not null default true
);

create table if not exists curriculum_years (
  id      serial primary key,
  program text not null default 'MBBS',
  year_no int  not null check (year_no between 1 and 6),
  label   text not null,
  unique (program, year_no)
);

create table if not exists terms (
  id                 serial primary key,
  batch_id           int not null references batches(id) on delete cascade,
  curriculum_year_id int not null references curriculum_years(id) on delete cascade,
  semester_no        int not null check (semester_no in (1, 2)),
  unique (batch_id, curriculum_year_id, semester_no)
);

create table if not exists modules (
  id                 serial primary key,
  code               text not null unique,
  slug               text not null unique,
  title              text,
  kind               text not null default 'horizontal' check (kind in ('horizontal', 'vertical')),
  curriculum_year_id int  not null references curriculum_years(id) on delete cascade,
  semester_no        int check (semester_no in (1, 2)),
  position           int  not null default 0,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now()
);
create index if not exists modules_year_idx on modules (curriculum_year_id, position);

create table if not exists subjects (
  id   serial primary key,
  name text not null unique,
  slug text not null unique
);

create table if not exists module_subjects (
  module_id  int not null references modules(id) on delete cascade,
  subject_id int not null references subjects(id) on delete cascade,
  confirmed  boolean not null default false,
  primary key (module_id, subject_id)
);
create index if not exists module_subjects_subject_idx on module_subjects (subject_id);

create table if not exists resources (
  id                uuid primary key default gen_random_uuid(),
  module_id         int  not null references modules(id) on delete cascade,
  subject_id        int  references subjects(id) on delete set null,
  title             text not null,
  description       text,
  type              text not null check (type in (
                      'slides', 'past_paper', 'mcq', 'summary_note',
                      'syllabus', 'practical_guide', 'reference', 'video_link')),
  exam_year         int check (exam_year between 1980 and 2100),
  audience_batch_id int references batches(id) on delete set null,

  storage_key   text,
  external_url  text,
  mime          text,
  size_bytes    bigint,
  page_count    int,
  sha256        text,
  language      text default 'en',

  status        text not null default 'pending_review'
                check (status in ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  uploader_name text,
  reviewer_name text,
  downloads     int not null default 0,
  is_demo       boolean not null default false,

  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint one_source check (
    (storage_key is not null)::int + (external_url is not null)::int = 1
  )
);

create unique index if not exists resources_sha256_uniq
  on resources (sha256) where sha256 is not null;
create index if not exists resources_module_idx  on resources (module_id, status);
create index if not exists resources_type_idx    on resources (type, status);
create index if not exists resources_pub_idx     on resources (published_at desc);
create index if not exists resources_search_idx  on resources
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));

create table if not exists reports (
  id          serial primary key,
  resource_id uuid not null references resources(id) on delete cascade,
  reason      text not null check (reason in (
                'broken_file', 'wrong_module', 'duplicate', 'copyright', 'low_quality', 'other')),
  detail      text,
  status      text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at  timestamptz not null default now()
);

create table if not exists events (
  id          bigserial primary key,
  resource_id uuid,
  kind        text not null check (kind in ('view', 'download', 'search', 'report', 'share')),
  query       text,
  created_at  timestamptz not null default now()
);
create index if not exists events_kind_idx on events (kind, created_at desc);

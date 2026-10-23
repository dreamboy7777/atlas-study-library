import { q } from "./db";

export type ResourceType =
  | "slides"
  | "past_paper"
  | "mcq"
  | "summary_note"
  | "syllabus"
  | "practical_guide"
  | "reference"
  | "video_link";

export const RESOURCE_TYPES: ResourceType[] = [
  "slides",
  "past_paper",
  "mcq",
  "summary_note",
  "syllabus",
  "practical_guide",
  "reference",
];

export const TYPE_LABEL: Record<ResourceType, string> = {
  slides: "Slides",
  past_paper: "Past paper",
  mcq: "MCQ",
  summary_note: "Summary note",
  syllabus: "Syllabus",
  practical_guide: "Practical",
  reference: "Reference",
  video_link: "Video",
};

export type Batch = { id: number; label: string };
export type Year = { id: number; year_no: number; label: string };

export type ModuleCard = {
  id: number;
  code: string;
  slug: string;
  title: string | null;
  kind: "horizontal" | "vertical";
  semester_no: number | null;
  total: number;
  papers: number;
  slides: number;
  notes: number;
};

export type ResourceRow = {
  id: string;
  title: string;
  type: ResourceType;
  exam_year: number | null;
  downloads: number;
  page_count: number | null;
  size_bytes: number | null;
  subject_name: string | null;
  published_at: string | null;
  module_code?: string;
  module_slug?: string;
  module_title?: string | null;
};

export type ModuleDetail = {
  id: number;
  code: string;
  slug: string;
  title: string | null;
  kind: "horizontal" | "vertical";
  semester_no: number | null;
  year_no: number;
  year_id: number;
};

export const getBatches = () =>
  q<Batch>(`select id, label from batches where is_active order by label desc`);

export const getYears = () =>
  q<Year>(`select id, year_no, label from curriculum_years order by year_no`);

export const getYearByNo = async (yearNo: number) => {
  const [row] = await q<Year & { id: number }>(
    `select id, year_no, label from curriculum_years where year_no = $1`,
    [yearNo]
  );
  return row ?? null;
};

export const getModules = (yearId: number, semester: number | null) =>
  q<ModuleCard>(
    `select m.id, m.code, m.slug, m.title, m.kind, m.semester_no,
            count(r.id) filter (where r.status = 'published')::int as total,
            count(r.id) filter (where r.status = 'published' and r.type = 'past_paper')::int as papers,
            count(r.id) filter (where r.status = 'published' and r.type = 'slides')::int as slides,
            count(r.id) filter (where r.status = 'published' and r.type in ('mcq','summary_note'))::int as notes
     from modules m
     left join resources r on r.module_id = m.id
     where m.is_active
       and m.curriculum_year_id = $1
       and ($2::int is null or m.semester_no is null or m.semester_no = $2::int)
     group by m.id
     order by m.position, m.code`,
    [yearId, semester]
  );

export const getModuleBySlug = async (slug: string) => {
  const [row] = await q<ModuleDetail>(
    `select m.id, m.code, m.slug, m.title, m.kind, m.semester_no,
            y.year_no, y.id as year_id
     from modules m
     join curriculum_years y on y.id = m.curriculum_year_id
     where m.slug = $1`,
    [slug]
  );
  return row ?? null;
};

export const getModuleSubjects = (moduleId: number) =>
  q<{ id: number; name: string; confirmed: boolean }>(
    `select s.id, s.name, ms.confirmed
     from module_subjects ms
     join subjects s on s.id = ms.subject_id
     where ms.module_id = $1
     order by s.name`,
    [moduleId]
  );

export const getModuleTypeCounts = (moduleId: number) =>
  q<{ type: ResourceType; n: number }>(
    `select type, count(*)::int as n
     from resources
     where module_id = $1 and status = 'published'
     group by type`,
    [moduleId]
  );

export const getModuleResources = (
  moduleId: number,
  type: ResourceType | null,
  subjectId: number | null
) =>
  q<ResourceRow>(
    `select r.id, r.title, r.type, r.exam_year, r.downloads, r.page_count,
            r.size_bytes, r.published_at, s.name as subject_name
     from resources r
     left join subjects s on s.id = r.subject_id
     where r.module_id = $1
       and r.status = 'published'
       and ($2::text is null or r.type = $2::text)
       and ($3::int  is null or r.subject_id = $3::int)
     order by r.published_at desc nulls last, r.title`,
    [moduleId, type, subjectId]
  );

export const getResource = async (id: string) => {
  const [row] = await q<
    ResourceRow & {
      module_id: number;
      subject_id: number | null;
      description: string | null;
      mime: string | null;
      storage_key: string | null;
      external_url: string | null;
      uploader_name: string | null;
      status: string;
      created_at: string;
      sha256: string | null;
      is_demo: boolean;
    }
  >(
    `select r.*, s.name as subject_name, m.code as module_code,
            m.slug as module_slug, m.title as module_title
     from resources r
     left join subjects s on s.id = r.subject_id
     join modules m on m.id = r.module_id
     where r.id = $1`,
    [id]
  );
  return row ?? null;
};

export const searchResources = (term: string, limit = 40) =>
  q<ResourceRow>(
    `select r.id, r.title, r.type, r.exam_year, r.downloads, r.page_count,
            r.size_bytes, r.published_at, s.name as subject_name,
            m.code as module_code, m.slug as module_slug, m.title as module_title,
            ts_rank(
              to_tsvector('simple', coalesce(r.title,'') || ' ' || coalesce(r.description,'')),
              websearch_to_tsquery('simple', $1)
            ) as rank
     from resources r
     join modules m on m.id = r.module_id
     left join subjects s on s.id = r.subject_id
     where r.status = 'published'
       and (
         to_tsvector('simple', coalesce(r.title,'') || ' ' || coalesce(r.description,''))
           @@ websearch_to_tsquery('simple', $1)
         or r.title ilike '%' || $1 || '%'
         or m.code  ilike '%' || $1 || '%'
         or coalesce(m.title,'') ilike '%' || $1 || '%'
       )
     order by rank desc, r.downloads desc, r.published_at desc nulls last
     limit $2`,
    [term, limit]
  );

export const getRecentResources = (limit = 6) =>
  q<ResourceRow>(
    `select r.id, r.title, r.type, r.exam_year, r.downloads,
            r.published_at, m.code as module_code, m.slug as module_slug
     from resources r
     join modules m on m.id = r.module_id
     where r.status = 'published'
     order by r.published_at desc nulls last, r.created_at desc
     limit $1`,
    [limit]
  );

export const getPlatformStats = async () => {
  const [row] = await q<{
    published: number;
    pending: number;
    modules: number;
    downloads: number;
    demo: number;
  }>(
    `select
       (select count(*)::int from resources where status = 'published') as published,
       (select count(*)::int from resources where status = 'pending_review') as pending,
       (select count(*)::int from modules where is_active) as modules,
       (select coalesce(sum(downloads),0)::int from resources) as downloads,
       (select count(*)::int from resources where is_demo) as demo`
  );
  return row;
};

export const getPending = () =>
  q<
    ResourceRow & {
      status: string;
      sha256: string | null;
      size_bytes: number | null;
      created_at: string;
      uploader_name: string | null;
    }
  >(
    `select r.id, r.title, r.type, r.exam_year, r.size_bytes, r.created_at,
            r.uploader_name, r.status, m.code as module_code, m.slug as module_slug,
            s.name as subject_name
     from resources r
     join modules m on m.id = r.module_id
     left join subjects s on s.id = r.subject_id
     where r.status = 'pending_review'
     order by r.created_at asc`
  );

export const getRecentlyPublished = (limit = 12) =>
  q<ResourceRow & { status: string }>(
    `select r.id, r.title, r.type, r.exam_year, r.downloads, r.published_at,
            r.status, m.code as module_code, m.slug as module_slug
     from resources r
     join modules m on m.id = r.module_id
     where r.status = 'published'
     order by r.published_at desc nulls last
     limit $1`,
    [limit]
  );

export const getModuleOptions = () =>
  q<{ id: number; code: string; title: string | null; year_no: number }>(
    `select m.id, m.code, m.title, y.year_no
     from modules m
     join curriculum_years y on y.id = m.curriculum_year_id
     where m.is_active
     order by y.year_no, m.position, m.code`
  );

export const getSubjectOptions = () =>
  q<{ id: number; name: string }>(`select id, name from subjects order by name`);

export const getOpenReports = () =>
  q<{
    id: number;
    resource_id: string;
    reason: string;
    detail: string | null;
    created_at: string;
    title: string;
  }>(
    `select rp.id, rp.resource_id, rp.reason, rp.detail, rp.created_at, r.title
     from reports rp
     join resources r on r.id = rp.resource_id
     where rp.status = 'open'
     order by rp.created_at asc`
  );

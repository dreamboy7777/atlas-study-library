import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip, EmptyState, KindBadge, ResourceRow } from "@/components/ui";
import { formatDate, typeLabel } from "@/lib/format";
import {
  getModuleBySlug,
  getModuleResources,
  getModuleSubjects,
  getModuleTypeCounts,
  RESOURCE_TYPES,
  type ResourceType,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string; subject?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const module = await getModuleBySlug(slug);
  if (!module) notFound();

  const type = (RESOURCE_TYPES as string[]).includes(sp.type ?? "")
    ? (sp.type as ResourceType)
    : null;
  const subjectId = sp.subject && /^\d+$/.test(sp.subject) ? Number(sp.subject) : null;

  const [counts, subjects, resources] = await Promise.all([
    getModuleTypeCounts(module.id),
    getModuleSubjects(module.id),
    getModuleResources(module.id, type, subjectId),
  ]);

  const countFor = (t: string) => counts.find((c) => c.type === t)?.n ?? 0;
  const total = counts.reduce((sum, c) => sum + c.n, 0);
  const tabs = RESOURCE_TYPES.filter((t) => countFor(t) > 0);

  const buildHref = (next: { type?: string | null; subject?: number | null }) => {
    const sp2 = new URLSearchParams();
    const nextType = next.type === undefined ? type : next.type;
    const nextSubject = next.subject === undefined ? subjectId : next.subject;
    if (nextType) sp2.set("type", nextType);
    if (nextSubject) sp2.set("subject", String(nextSubject));
    const qs = sp2.toString();
    return `/m/${module.slug}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <nav className="text-xs text-slate-500">
        <Link href={`/?y=${module.year_no}`} className="hover:text-teal-700">
          Year {module.year_no}
        </Link>
        <span className="mx-2">/</span>
        <span className="font-mono text-slate-700">{module.code}</span>
      </nav>

      <header className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-900">
            {module.code}
          </h1>
          <KindBadge kind={module.kind} />
          <span className="text-xs text-slate-500">
            {total} {total === 1 ? "file" : "files"}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {module.title ?? <span className="italic text-slate-400">Title not set yet</span>}
        </p>

        {subjects.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Subject
            </span>
            <Chip href={buildHref({ subject: null })} active={subjectId === null}>
              All
            </Chip>
            {subjects.map((s) => (
              <Chip
                key={s.id}
                href={buildHref({ subject: s.id })}
                active={subjectId === s.id}
              >
                {s.name}
              </Chip>
            ))}
            {subjects.every((s) => !s.confirmed) ? (
              <span className="text-[11px] text-amber-700" title="Module → subject mapping unconfirmed">
                mapping unconfirmed
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      {tabs.length ? (
        <div className="scroll-thin flex gap-2 overflow-x-auto pb-1">
          <Chip href={buildHref({ type: null })} active={type === null}>
            All ({total})
          </Chip>
          {tabs.map((t) => (
            <Chip key={t} href={buildHref({ type: t })} active={type === t}>
              {typeLabel(t)} ({countFor(t)})
            </Chip>
          ))}
        </div>
      ) : null}

      {resources.length ? (
        <div className="space-y-2">
          {resources.map((r) => (
            <ResourceRow key={r.id} r={r} />
          ))}
        </div>
      ) : (
        <EmptyState title="No files match this filter">
          {total === 0
            ? "Nothing has been published for this module yet. Ask your batch rep to upload the slides and past papers."
            : "Try a different type or subject."}
        </EmptyState>
      )}

      <p className="text-xs text-slate-500">
        Last updated {formatDate(resources[0]?.published_at)} ·{" "}
        <Link href="/admin" className="hover:text-teal-700">
          contribute a file
        </Link>
      </p>
    </div>
  );
}

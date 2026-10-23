import Link from "next/link";
import { Chip, EmptyState, ModuleTile, ResourceRow } from "@/components/ui";
import { getBatches, getModules, getRecentResources, getYears } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Params = { b?: string; y?: string; sem?: string };

function href(next: { b?: string; y?: string; sem?: string | null }) {
  const sp = new URLSearchParams();
  if (next.b) sp.set("b", next.b);
  if (next.y) sp.set("y", next.y);
  if (next.sem) sp.set("sem", next.sem);
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const sp = await searchParams;

  const [batches, years, recent] = await Promise.all([
    getBatches(),
    getYears(),
    getRecentResources(4),
  ]);

  if (!years.length) {
    return (
      <EmptyState title="Database is empty">
        Run <code className="font-mono">npm run db:setup</code> to load the curriculum.
      </EmptyState>
    );
  }

  const requestedYear = Number(sp.y);
  const year =
    years.find((y) => y.year_no === requestedYear) ?? years[years.length - 1];
  const batch = batches.find((b) => b.label === sp.b) ?? batches[0];
  const semester = sp.sem === "1" ? 1 : sp.sem === "2" ? 2 : null;

  const modules = await getModules(year.id, semester);
  const totalFiles = modules.reduce((sum, m) => sum + m.total, 0);
  const semesterMapped = modules.some((m) => m.semester_no !== null);

  const base = { b: batch?.label, y: String(year.year_no) };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-teal-50/60 p-5">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Your semester, minus the 8,000 messages.
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Pick your batch and year. Every file has one home, one link, and a download button that
          works.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Batch
          </span>
          {batches.map((b) => (
            <Chip
              key={b.id}
              href={href({ ...base, b: b.label, sem: semester ? String(semester) : undefined })}
              active={b.label === batch?.label}
            >
              {b.label}
            </Chip>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Year
          </span>
          {years.map((y) => (
            <Chip
              key={y.id}
              href={href({ ...base, y: String(y.year_no), sem: semester ? String(semester) : undefined })}
              active={y.year_no === year.year_no}
            >
              {y.label}
            </Chip>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Semester
          </span>
          <Chip href={href({ ...base })} active={semester === null}>
            All
          </Chip>
          <Chip href={href({ ...base, sem: "1" })} active={semester === 1}>
            1st
          </Chip>
          <Chip href={href({ ...base, sem: "2" })} active={semester === 2}>
            2nd
          </Chip>
        </div>

        {!semesterMapped ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
            Semester mapping is not set for Year {year.year_no} yet, so the semester filter does not
            narrow anything. Fill <code className="font-mono">seed/catalog.json</code> →{" "}
            <code className="font-mono">semester_hint</code>.
          </p>
        ) : null}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            {year.label} · {modules.length} modules
          </h2>
          <span className="text-xs text-slate-500">{totalFiles} files published</span>
        </div>

        {modules.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <ModuleTile key={m.id} module={m} />
            ))}
          </div>
        ) : (
          <EmptyState title="No modules for this selection" />
        )}
      </section>

      {recent.length ? (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Recently added
            </h2>
            <Link href="/search?q=" className="text-xs font-semibold text-teal-700 hover:underline">
              Browse everything
            </Link>
          </div>
          <div className="space-y-2">
            {recent.map((r) => (
              <ResourceRow key={r.id} r={r} showModule />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

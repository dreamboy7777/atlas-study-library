import Link from "next/link";
import { EmptyState, ResourceRow } from "@/components/ui";
import { getRecentResources, searchResources } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();
  const results = term ? await searchResources(term) : [];
  const fallback = term && !results.length ? await getRecentResources(4) : [];

  return (
    <div className="space-y-5">
      <form action="/search" className="flex gap-2">
        <input
          name="q"
          defaultValue={term}
          autoFocus
          placeholder="e.g. NEU-205 final, cranial nerves, MCQ 2024"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Search
        </button>
      </form>

      {!term ? (
        <EmptyState title="Search the whole library">
          Try a module code (<span className="font-mono">NEU-205</span>), a topic ({" "}
          <em>cranial nerves</em>), or a year (<span className="font-mono">2024</span>).
        </EmptyState>
      ) : results.length ? (
        <>
          <p className="text-xs text-slate-500">
            {results.length} {results.length === 1 ? "result" : "results"} for{" "}
            <span className="font-semibold text-slate-700">“{term}”</span>
          </p>
          <div className="space-y-2">
            {results.map((r) => (
              <ResourceRow key={r.id} r={r} showModule />
            ))}
          </div>
        </>
      ) : (
        <>
          <EmptyState title={`No files found for “${term}”`}>
            Nothing in the catalogue matches yet. If it exists in a Telegram channel, it has not been
            catalogued — <Link href="/admin" className="font-semibold text-teal-700 hover:underline">upload it</Link>{" "}
            and it becomes searchable for everyone.
          </EmptyState>
          {fallback.length ? (
            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                Recently added instead
              </h2>
              <div className="space-y-2">
                {fallback.map((r) => (
                  <ResourceRow key={r.id} r={r} showModule />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

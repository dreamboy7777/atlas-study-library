import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import {
  RESOURCE_TYPES,
  getModuleOptions,
  getOpenReports,
  getPending,
  getPlatformStats,
  getRecentlyPublished,
  getSubjectOptions,
} from "@/lib/queries";
import { formatBytes, formatDate, typeLabel } from "@/lib/format";
import { TypePill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; uploaded?: string; done?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const sp = await searchParams;

  const [stats, modules, subjects, pending, published, reports] = await Promise.all([
    getPlatformStats(),
    getModuleOptions(),
    getSubjectOptions(),
    getPending(),
    getRecentlyPublished(10),
    getOpenReports(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Admin console</h1>
          <p className="text-xs text-slate-500">
            Upload → review → publish. Nothing is visible to students until you approve it.
          </p>
        </div>
        <form action="/api/admin/logout" method="post">
          <button className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-slate-400">
            Sign out
          </button>
        </form>
      </header>

      {sp.error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">
          {sp.error}
        </p>
      ) : null}
      {sp.uploaded ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          Upload received — it is in the review queue below.
        </p>
      ) : null}
      {sp.done ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          Done: {sp.done}.
        </p>
      ) : null}

      {stats.demo > 0 ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
          {stats.demo} demo files are published so the UI is not empty.{" "}
          <code className="font-mono">npm run db:reset</code> removes them (and the catalogue), then{" "}
          <code className="font-mono">npm run db:setup -- --no-demo</code> reloads the catalogue only.
        </p>
      ) : null}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Published", stats.published],
          ["Pending review", stats.pending],
          ["Modules", stats.modules],
          ["Downloads", stats.downloads],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </div>
            <div className="text-xl font-bold text-slate-900">{value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-900">Upload a file</h2>
        <p className="mt-1 text-xs text-slate-500">
          PDF only for now (25 MB max). Duplicate files are rejected by SHA-256 — the check happens
          before anything is stored.
        </p>

        <form
          action="/api/admin/upload"
          method="post"
          encType="multipart/form-data"
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <label className="text-xs font-semibold text-slate-600">
            Module
            <select
              name="module_id"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
            >
              <option value="">Select module…</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  Y{m.year_no} · {m.code}
                  {m.title ? ` — ${m.title}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Type
            <select
              name="type"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
            >
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {typeLabel(t)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
            Title
            <input
              name="title"
              required
              maxLength={160}
              placeholder="Final 2024 — MCQ paper (with answer key)"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Subject <span className="font-normal text-slate-400">(optional)</span>
            <select
              name="subject_id"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
            >
              <option value="">Not specified</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Exam year <span className="font-normal text-slate-400">(optional)</span>
            <input
              name="exam_year"
              type="number"
              min={1980}
              max={2100}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
            PDF file
            <input
              name="file"
              type="file"
              accept="application/pdf,.pdf"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold"
            />
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:col-span-2">
            <input type="checkbox" name="publish" value="1" />
            Publish immediately (skip the queue — you are the reviewer)
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Upload
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-slate-900">
          Review queue {pending.length ? `(${pending.length})` : ""}
        </h2>
        {pending.length ? (
          <div className="space-y-2">
            {pending.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <TypePill type={r.type} />
                    <span className="font-mono text-xs text-slate-600">{r.module_code}</span>
                    {r.exam_year ? (
                      <span className="text-xs text-slate-500">{r.exam_year}</span>
                    ) : null}
                    <span className="text-xs text-slate-400">{formatBytes(r.size_bytes)}</span>
                  </div>
                  <Link
                    href={`/r/${r.id}`}
                    className="mt-1 block truncate text-sm font-medium hover:text-teal-700"
                  >
                    {r.title}
                  </Link>
                  <p className="text-[11px] text-slate-500">
                    from {r.uploader_name ?? "unknown"} · {formatDate(r.created_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={`/api/admin/resource/${r.id}`} method="post">
                    <input type="hidden" name="action" value="approve" />
                    <button className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800">
                      Approve
                    </button>
                  </form>
                  <form action={`/api/admin/resource/${r.id}`} method="post">
                    <input type="hidden" name="action" value="reject" />
                    <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-6 text-center text-xs text-slate-500">
            Queue is clear.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-slate-900">Recently published</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Title</th>
                <th className="px-3 py-2 font-semibold">Module</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">DL</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {published.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="max-w-[22rem] truncate px-3 py-2">
                    <Link href={`/r/${r.id}`} className="hover:text-teal-700">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-600">{r.module_code}</td>
                  <td className="px-3 py-2 text-slate-600">{typeLabel(r.type)}</td>
                  <td className="px-3 py-2 text-slate-600">{r.downloads}</td>
                  <td className="px-3 py-2 text-right">
                    <form action={`/api/admin/resource/${r.id}`} method="post">
                      <input type="hidden" name="action" value="unpublish" />
                      <button className="font-semibold text-slate-500 hover:text-rose-700">
                        Unpublish
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {!published.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    Nothing published yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {reports.length ? (
        <section>
          <h2 className="mb-2 text-sm font-bold text-slate-900">Open reports</h2>
          <div className="space-y-2">
            {reports.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-3 text-xs"
              >
                <span className="rounded bg-white px-2 py-0.5 font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                  {r.reason.replace("_", " ")}
                </span>
                <Link href={`/r/${r.resource_id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                  {r.title}
                </Link>
                {r.detail ? <span className="text-slate-600">“{r.detail}”</span> : null}
                <form action={`/api/admin/resource/${r.resource_id}`} method="post">
                  <input type="hidden" name="action" value="unpublish" />
                  <button className="font-semibold text-rose-700 hover:underline">Hide file</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

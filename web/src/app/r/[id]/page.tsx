import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/CopyLink";
import { TypePill } from "@/components/ui";
import { formatBytes, formatDate } from "@/lib/format";
import { getResource } from "@/lib/queries";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reported?: string }>;
}) {
  const { id } = await params;
  const { reported } = await searchParams;

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const resource = await getResource(id);
  const admin = await isAdmin();
  if (!resource || (resource.status !== "published" && !admin)) notFound();

  const hasFile = Boolean(resource.storage_key);

  return (
    <div className="space-y-5">
      <nav className="text-xs text-slate-500">
        <Link href={`/m/${resource.module_slug}`} className="hover:text-teal-700">
          {resource.module_code}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{resource.title}</span>
      </nav>

      {resource.status !== "published" ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
          Not published — this preview is only visible to admins (status: {resource.status}).
        </p>
      ) : null}

      {reported ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          Thanks — a moderator will look at this file.
        </p>
      ) : null}

      <header className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <TypePill type={resource.type} />
          {resource.exam_year ? (
            <span className="text-xs font-semibold text-slate-500">{resource.exam_year}</span>
          ) : null}
          {resource.is_demo ? (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
              demo
            </span>
          ) : null}
        </div>

        <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900">{resource.title}</h1>
        {resource.description ? (
          <p className="mt-1 text-sm text-slate-600">{resource.description}</p>
        ) : null}

        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-slate-500">Module</dt>
            <dd className="font-semibold text-slate-800">{resource.module_code}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Subject</dt>
            <dd className="font-semibold text-slate-800">{resource.subject_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Size · pages</dt>
            <dd className="font-semibold text-slate-800">
              {formatBytes(resource.size_bytes)} · {resource.page_count ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Downloads</dt>
            <dd className="font-semibold text-slate-800">{resource.downloads}</dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {hasFile ? (
            <a
              href={`/api/download/${resource.id}`}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Download {formatBytes(resource.size_bytes)}
            </a>
          ) : resource.external_url ? (
            <a
              href={resource.external_url}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Open link
            </a>
          ) : (
            <span className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500">
              File unavailable
            </span>
          )}

          <CopyLink path={`/r/${resource.id}`} />
          <span className="text-xs text-slate-500">
            added {formatDate(resource.published_at ?? resource.created_at)}
            {resource.uploader_name ? ` by ${resource.uploader_name}` : ""}
          </span>
        </div>
      </header>

      {hasFile && resource.mime === "application/pdf" ? (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Preview</h2>
            <a
              href={`/api/file/${resource.id}`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs font-semibold text-teal-700 hover:underline"
            >
              Open in new tab
            </a>
          </div>
          <iframe
            src={`/api/file/${resource.id}`}
            title={resource.title}
            className="h-[70vh] w-full bg-slate-100"
          />
        </section>
      ) : null}

      <details className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <summary className="cursor-pointer text-xs font-semibold text-slate-600">
          Report a problem with this file
        </summary>
        <form action="/api/report" method="post" className="mt-3 space-y-2">
          <input type="hidden" name="resource_id" value={resource.id} />
          <select
            name="reason"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="broken_file">File will not open / is corrupted</option>
            <option value="wrong_module">Wrong module or subject</option>
            <option value="duplicate">Duplicate of another file</option>
            <option value="copyright">Should not be published</option>
            <option value="low_quality">Unreadable scan</option>
            <option value="other">Something else</option>
          </select>
          <textarea
            name="detail"
            rows={2}
            placeholder="Optional detail"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400"
          >
            Send report
          </button>
        </form>
      </details>
    </div>
  );
}

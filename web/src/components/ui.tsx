import Link from "next/link";
import type { ReactNode } from "react";
import type { ModuleCard, ResourceRow as Row } from "@/lib/queries";
import { formatBytes, typeLabel, typeTone } from "@/lib/format";

export function TypePill({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${typeTone(type)}`}
    >
      {typeLabel(type)}
    </span>
  );
}

export function KindBadge({ kind }: { kind: "horizontal" | "vertical" }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        kind === "vertical"
          ? "bg-amber-100 text-amber-800"
          : "bg-slate-100 text-slate-600"
      }`}
      title={kind === "vertical" ? "Vertical module" : "Horizontal module"}
    >
      {kind === "vertical" ? "Vertical" : "Horizontal"}
    </span>
  );
}

export function ModuleTile({ module }: { module: ModuleCard }) {
  const bits = [
    `${module.total} ${module.total === 1 ? "file" : "files"}`,
    module.papers ? `${module.papers} papers` : null,
    module.slides ? `${module.slides} decks` : null,
  ].filter(Boolean);

  return (
    <Link
      href={`/m/${module.slug}`}
      className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-teal-400 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-sm font-bold text-slate-900">{module.code}</span>
        <KindBadge kind={module.kind} />
      </div>
      <span className="truncate text-sm text-slate-600">
        {module.title ?? <span className="italic text-slate-400">Title not set</span>}
      </span>
      <span className="mt-auto text-xs text-slate-500">{bits.join(" · ")}</span>
    </Link>
  );
}

export function ResourceRow({ r, showModule = false }: { r: Row; showModule?: boolean }) {
  const meta = [
    showModule ? null : r.subject_name,
    showModule ? r.subject_name : null,
    r.page_count ? `${r.page_count} pages` : null,
    r.size_bytes ? formatBytes(r.size_bytes) : null,
    r.downloads ? `${r.downloads} downloads` : null,
  ].filter(Boolean);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-teal-300">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <TypePill type={r.type} />
          {r.exam_year ? (
            <span className="text-xs font-semibold text-slate-500">{r.exam_year}</span>
          ) : null}
          {showModule && r.module_code ? (
            <Link
              href={`/m/${r.module_slug}`}
              className="text-xs font-semibold text-teal-700 hover:underline"
            >
              {r.module_code}
            </Link>
          ) : null}
        </div>
        <Link
          href={`/r/${r.id}`}
          className="mt-1 block truncate text-sm font-medium text-slate-900 hover:text-teal-700"
        >
          {r.title}
        </Link>
        {meta.length ? (
          <p className="mt-0.5 truncate text-xs text-slate-500">{meta.join(" · ")}</p>
        ) : null}
      </div>
      <a
        href={`/api/download/${r.id}`}
        className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-teal-600 hover:text-teal-700"
        title="Download"
      >
        Download
      </a>
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {children ? <div className="mt-1 text-xs text-slate-500">{children}</div> : null}
    </div>
  );
}

export function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
        active
          ? "border-teal-700 bg-teal-700 text-white"
          : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
      }`}
    >
      {children}
    </Link>
  );
}

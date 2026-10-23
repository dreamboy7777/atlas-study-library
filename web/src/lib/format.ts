import type { ResourceType } from "./queries";
import { TYPE_LABEL } from "./queries";

export const typeLabel = (t: ResourceType | string) =>
  TYPE_LABEL[t as ResourceType] ?? String(t).replace("_", " ");

export const typeTone = (t: ResourceType | string) => {
  switch (t) {
    case "slides":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "past_paper":
      return "bg-amber-50 text-amber-800 ring-amber-200";
    case "mcq":
      return "bg-violet-50 text-violet-700 ring-violet-200";
    case "summary_note":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "syllabus":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "practical_guide":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
};

export const formatBytes = (bytes: number | null | undefined) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** Module codes like "EPE-2" or "Critical thinking" both need a usable URL segment. */
export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

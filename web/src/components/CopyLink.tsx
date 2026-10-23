"use client";

import { useState } from "react";

export function CopyLink({ path, label = "Share" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        const url = new URL(path, window.location.origin).toString();
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          window.prompt("Copy this link:", url);
        }
      }}
      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-teal-600 hover:text-teal-700"
    >
      {copied ? "Link copied" : label}
    </button>
  );
}

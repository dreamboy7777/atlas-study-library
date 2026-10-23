import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyHub — study materials, organised",
  description:
    "Slides, past papers, MCQs and summary notes for every module — searchable, deduplicated, no scrolling.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">
                SH
              </span>
              <span className="hidden text-base font-semibold tracking-tight text-slate-900 sm:block">
                StudyHub
              </span>
            </Link>

            <form action="/search" className="ml-auto flex w-full max-w-sm items-center gap-2">
              <label htmlFor="q" className="sr-only">
                Search materials
              </label>
              <input
                id="q"
                name="q"
                type="search"
                placeholder="Search papers, slides, notes…"
                autoComplete="off"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
            </form>

            <Link
              href="/admin"
              className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-slate-400 hover:text-slate-900"
            >
              Admin
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>

        <footer className="mx-auto w-full max-w-5xl px-4 pb-10 pt-4 text-xs text-slate-500">
          <p>
            StudyHub · student-run library. Files belong to their authors — report anything that
            should not be here.
          </p>
        </footer>
      </body>
    </html>
  );
}

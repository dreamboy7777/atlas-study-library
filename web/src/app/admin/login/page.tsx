import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm space-y-4 pt-10">
      <h1 className="text-lg font-bold tracking-tight">Admin sign-in</h1>
      <p className="text-xs text-slate-500">
        Passcode from <code className="font-mono">ADMIN_PASSCODE</code> in{" "}
        <code className="font-mono">.env.local</code>. Default for local dev is{" "}
        <code className="font-mono">kellyisthecutest</code>.
      </p>

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">
          Wrong passcode.
        </p>
      ) : null}

      <form action="/api/admin/login" method="post" className="space-y-3">
        <input
          name="passcode"
          type="password"
          required
          autoFocus
          placeholder="Passcode"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button className="w-full rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
          Sign in
        </button>
      </form>
    </div>
  );
}

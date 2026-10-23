import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const runtime = "nodejs";

const REASONS = [
  "broken_file",
  "wrong_module",
  "duplicate",
  "copyright",
  "low_quality",
  "other",
];

export async function POST(request: Request) {
  const form = await request.formData();
  const resourceId = String(form.get("resource_id") ?? "");
  const reason = String(form.get("reason") ?? "");
  const detail = String(form.get("detail") ?? "").trim() || null;

  if (!/^[0-9a-f-]{36}$/i.test(resourceId) || !REASONS.includes(reason)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  await q(`insert into reports (resource_id, reason, detail) values ($1, $2, $3)`, [
    resourceId,
    reason,
    detail,
  ]);
  await q(`insert into events (resource_id, kind) values ($1, 'report')`, [resourceId]);

  return NextResponse.redirect(
    new URL(`/r/${resourceId}?reported=1`, request.url),
    { status: 303 }
  );
}

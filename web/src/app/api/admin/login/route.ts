import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminToken, checkPasscode } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const passcode = String(form.get("passcode") ?? "");

  if (!checkPasscode(passcode)) {
    return NextResponse.redirect(new URL("/admin/login?error=1", request.url), { status: 303 });
  }

  const res = NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
  res.cookies.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}

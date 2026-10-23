import { createHash } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "sh_admin";

export function adminToken() {
  const passcode = process.env.ADMIN_PASSCODE || "kellyisthecutest";
  const secret = process.env.ADMIN_SECRET || "studyhub-local";
  return createHash("sha256").update(`${passcode}::${secret}`).digest("hex");
}

export async function isAdmin() {
  const jar = await cookies();
  const value = jar.get(ADMIN_COOKIE)?.value;
  return Boolean(value) && value === adminToken();
}

export function checkPasscode(input: string) {
  const expected = process.env.ADMIN_PASSCODE || "kellyisthecutest";
  return input === expected;
}

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness probe — also proves the database handle can be opened. */
export async function GET() {
  const started = Date.now();
  try {
    const db = await getDb();
    await db.query("select 1 as ok");
    return NextResponse.json({
      ok: true,
      engine: db.kind,
      ms: Date.now() - started,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message, ms: Date.now() - started },
      { status: 500 }
    );
  }
}

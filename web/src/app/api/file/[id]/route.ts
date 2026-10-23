import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { q } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });

  const [row] = await q<{ storage_key: string | null; mime: string | null; status: string }>(
    `select storage_key, mime, status from resources where id = $1`,
    [id]
  );

  const allowed = row?.status === "published" || (row && (await isAdmin()));
  if (!row || !allowed || !row.storage_key) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const bytes = await readFile(
      path.join(process.cwd(), ".data", "uploads", path.basename(row.storage_key))
    );
    return new NextResponse(new Blob([new Uint8Array(bytes)]), {
      headers: {
        "Content-Type": row.mime ?? "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return new NextResponse("File missing on disk", { status: 410 });
  }
}

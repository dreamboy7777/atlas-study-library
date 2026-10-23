import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { q } from "@/lib/db";
import { slugify } from "@/lib/format";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });

  const [row] = await q<{
    storage_key: string | null;
    mime: string | null;
    title: string;
    size_bytes: number | null;
    status: string;
  }>(
    `select storage_key, mime, title, size_bytes, status
     from resources where id = $1`,
    [id]
  );

  if (!row || row.status !== "published" || !row.storage_key) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(
    process.cwd(),
    ".data",
    "uploads",
    path.basename(row.storage_key)
  );

  // Locally we stream the file. In production swap this for a short-lived
  // signed R2/S3 URL after logging the download — same contract, no bytes
  // through the app server.
  let bytes: Buffer;
  try {
    bytes = await readFile(filePath);
  } catch {
    return new NextResponse("File missing on disk", { status: 410 });
  }

  await q(`update resources set downloads = downloads + 1 where id = $1`, [id]);
  await q(`insert into events (resource_id, kind) values ($1, 'download')`, [id]);

  const filename = `${slugify(row.title) || "file"}.pdf`;

  return new NextResponse(new Blob([new Uint8Array(bytes)]), {
    status: 200,
    headers: {
      "Content-Type": row.mime ?? "application/pdf",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}

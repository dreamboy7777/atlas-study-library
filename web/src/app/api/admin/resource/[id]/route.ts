import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { isAdmin } from "@/lib/auth";
import { q } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  if (!(await isAdmin())) {
    return NextResponse.redirect(new URL("/admin/login", request.url), { status: 303 });
  }

  const { id } = await params;
  const form = await request.formData();
  const action = String(form.get("action") ?? "");

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.redirect(new URL("/admin?error=Bad+id", request.url), { status: 303 });
  }

  const [row] = await q<{ storage_key: string | null; title: string }>(
    `select storage_key, title from resources where id = $1`,
    [id]
  );
  if (!row) {
    return NextResponse.redirect(new URL("/admin?error=Not+found", request.url), { status: 303 });
  }

  let done = "";

  switch (action) {
    case "approve":
      await q(
        `update resources
         set status = 'published', published_at = coalesce(published_at, now()),
             reviewer_name = 'admin', updated_at = now()
         where id = $1`,
        [id]
      );
      done = "approved";
      break;

    case "reject":
      await q(`update resources set status = 'rejected', updated_at = now() where id = $1`, [id]);
      done = "rejected";
      break;

    case "unpublish":
      await q(`update resources set status = 'archived', updated_at = now() where id = $1`, [id]);
      await q(`update reports set status = 'resolved' where resource_id = $1 and status = 'open'`, [id]);
      done = "hidden";
      break;

    case "delete":
      await q(`delete from resources where id = $1`, [id]);
      if (row.storage_key) {
        await unlink(path.join(process.cwd(), ".data", "uploads", path.basename(row.storage_key))).catch(
          () => {}
        );
      }
      done = "deleted";
      break;

    default:
      return NextResponse.redirect(new URL("/admin?error=Unknown+action", request.url), {
        status: 303,
      });
  }

  return NextResponse.redirect(new URL(`/admin?done=${encodeURIComponent(done)}`, request.url), {
    status: 303,
  });
}

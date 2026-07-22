import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabase, getDatabase } from "@/db/runtime";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = z.object({ enabled: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid rule state." }, { status: 400 });
  await ensureDatabase();
  const { id } = await params;
  await getDatabase().prepare("UPDATE rules SET enabled = ? WHERE id = ?").bind(Number(parsed.data.enabled), id).run();
  return NextResponse.json({ updated: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDatabase();
  const { id } = await params;
  await getDatabase().prepare("DELETE FROM rules WHERE id = ?").bind(id).run();
  return NextResponse.json({ deleted: true });
}

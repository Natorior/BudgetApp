import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabase, getDatabase } from "@/db/runtime";

const requestSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  categoryId: z.string().nullable().optional(),
  entityId: z.string().optional(),
});

export async function PATCH(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (parsed.data.categoryId === undefined && !parsed.data.entityId)) {
    return NextResponse.json({ error: "Choose a bulk action." }, { status: 400 });
  }
  await ensureDatabase();
  const db = getDatabase();
  let bucket: string | null | undefined;
  if (parsed.data.categoryId) {
    const category = await db.prepare("SELECT default_bucket FROM categories WHERE id = ?").bind(parsed.data.categoryId).first<{ default_bucket: string }>();
    if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    bucket = category.default_bucket;
  }
  if (parsed.data.entityId) {
    const entity = await db.prepare("SELECT id FROM entities WHERE id = ? AND is_active = 1").bind(parsed.data.entityId).first();
    if (!entity) return NextResponse.json({ error: "Entity not found." }, { status: 404 });
  }
  const statements = parsed.data.ids.map((id) => {
    if (parsed.data.categoryId !== undefined && parsed.data.entityId) {
      return db.prepare("UPDATE transactions SET category_id = ?, bucket = ?, entity_id = ?, category_source = 'user', entity_source = 'user', user_locked = 1, updated_at = unixepoch() WHERE id = ?")
        .bind(parsed.data.categoryId, bucket, parsed.data.entityId, id);
    }
    if (parsed.data.categoryId !== undefined) {
      return db.prepare("UPDATE transactions SET category_id = ?, bucket = ?, category_source = 'user', user_locked = 1, updated_at = unixepoch() WHERE id = ?")
        .bind(parsed.data.categoryId, bucket, id);
    }
    return db.prepare("UPDATE transactions SET entity_id = ?, entity_source = 'user', user_locked = 1, updated_at = unixepoch() WHERE id = ?")
      .bind(parsed.data.entityId, id);
  });
  for (let offset = 0; offset < statements.length; offset += 75) await db.batch(statements.slice(offset, offset + 75));
  return NextResponse.json({ updated: parsed.data.ids.length });
}

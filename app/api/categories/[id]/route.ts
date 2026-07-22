import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabase, getDatabase } from "@/db/runtime";

const schema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  colorToken: z.enum(["category-1", "category-2", "category-3", "category-4", "category-5", "category-6", "category-7", "category-8"]).optional(),
  isArchived: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !Object.keys(parsed.data).length) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  const { id } = await params;
  if (["cat_transfer", "cat_uncategorized", "cat_ignore"].includes(id) && parsed.data.isArchived) {
    return NextResponse.json({ error: "System categories cannot be archived." }, { status: 400 });
  }
  await ensureDatabase();
  const current = await getDatabase().prepare("SELECT name, color_token, is_archived FROM categories WHERE id = ? AND parent_id IS NOT NULL").bind(id).first<{ name: string; color_token: string; is_archived: number }>();
  if (!current) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  await getDatabase().prepare("UPDATE categories SET name = ?, color_token = ?, is_archived = ? WHERE id = ?")
    .bind(parsed.data.name ?? current.name, parsed.data.colorToken ?? current.color_token, parsed.data.isArchived === undefined ? current.is_archived : Number(parsed.data.isArchived), id).run();
  return NextResponse.json({ updated: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabase, getDatabase } from "@/db/runtime";

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  bucket: z.enum(["need", "want", "save", "income", "transfer", "ignore"]),
  colorToken: z.enum(["category-1", "category-2", "category-3", "category-4", "category-5", "category-6", "category-7", "category-8"]),
});

const parents: Record<z.infer<typeof schema>["bucket"], string> = {
  need: "cat_needs", want: "cat_wants", save: "cat_savings", income: "cat_income",
  transfer: "cat_system", ignore: "cat_system",
};

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a name, bucket, and color." }, { status: 400 });
  await ensureDatabase();
  const id = crypto.randomUUID();
  const { name, bucket, colorToken } = parsed.data;
  await getDatabase().prepare(`INSERT INTO categories
    (id, name, parent_id, color_token, default_bucket, sort_order)
    VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories))`)
    .bind(id, name, parents[bucket], colorToken, bucket).run();
  return NextResponse.json({ id }, { status: 201 });
}

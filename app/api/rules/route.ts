import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabase, getDatabase } from "@/db/runtime";

export const ruleInput = z.object({
  name: z.string().trim().min(1).max(80),
  priority: z.number().int().min(1).max(999).default(100),
  matchField: z.enum(["merchant", "description"]),
  matchOp: z.enum(["contains", "equals"]),
  matchValue: z.string().trim().min(1).max(120),
  categoryId: z.string().nullable(),
  bucket: z.enum(["need", "want", "save", "income", "transfer", "ignore"]).nullable(),
  entityId: z.string().nullable(),
});

export async function POST(request: Request) {
  const parsed = ruleInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.categoryId && !parsed.data.entityId)) return NextResponse.json({ error: "Choose what this rule should assign." }, { status: 400 });
  await ensureDatabase();
  const id = crypto.randomUUID();
  const value = parsed.data;
  await getDatabase().prepare(`INSERT INTO rules
    (id, name, priority, enabled, match_field, match_op, match_value, set_category_id, set_bucket, set_entity_id)
    VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`)
    .bind(id, value.name, value.priority, value.matchField, value.matchOp, value.matchValue, value.categoryId, value.bucket, value.entityId).run();
  return NextResponse.json({ id }, { status: 201 });
}

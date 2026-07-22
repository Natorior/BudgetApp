import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabase, getDatabase } from "@/db/runtime";

const bucketSchema = z.enum(["need", "want", "save", "income", "transfer", "ignore"]);
const splitSchema = z.object({
  amountCents: z.number().int().safe(),
  categoryId: z.string().nullable(),
  entityId: z.string().min(1),
  note: z.string().max(500).default(""),
});
const updateSchema = z.object({
  categoryId: z.string().nullable(),
  bucket: bucketSchema.nullable(),
  entityId: z.string().min(1),
  notes: z.string().max(2000).default(""),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  isTransfer: z.boolean().default(false),
  createRule: z.boolean().default(false),
  splits: z.array(splitSchema).max(20).default([]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the transaction fields." }, { status: 400 });
  await ensureDatabase();
  const db = getDatabase();
  const existing = await db
    .prepare("SELECT amount_cents, merchant_clean, description_raw FROM transactions WHERE id = ?")
    .bind(id)
    .first<{ amount_cents: number; merchant_clean: string | null; description_raw: string }>();
  if (!existing) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });

  const entity = await db.prepare("SELECT id FROM entities WHERE id = ? AND is_active = 1").bind(parsed.data.entityId).first();
  if (!entity) return NextResponse.json({ error: "Choose an active entity." }, { status: 400 });

  let bucket = parsed.data.bucket;
  if (parsed.data.categoryId) {
    const category = await db
      .prepare("SELECT default_bucket FROM categories WHERE id = ? AND is_archived = 0")
      .bind(parsed.data.categoryId)
      .first<{ default_bucket: z.infer<typeof bucketSchema> }>();
    if (!category) return NextResponse.json({ error: "Choose an active category." }, { status: 400 });
    bucket ??= category.default_bucket;
  }
  if (parsed.data.isTransfer) bucket = "transfer";

  if (parsed.data.splits.length) {
    const splitTotal = parsed.data.splits.reduce((total, split) => total + split.amountCents, 0);
    if (splitTotal !== existing.amount_cents) {
      return NextResponse.json({ error: "Split amounts must equal the original transaction exactly." }, { status: 400 });
    }
  }

  const statements: D1PreparedStatement[] = [
    db.prepare(`UPDATE transactions SET
      category_id = ?, bucket = ?, entity_id = ?, notes = ?, tags = ?,
      is_transfer = ?, is_split_parent = ?, user_locked = 1,
      category_source = 'user', entity_source = 'user', updated_at = unixepoch()
      WHERE id = ?`)
      .bind(parsed.data.categoryId, bucket, parsed.data.entityId, parsed.data.notes || null, JSON.stringify(parsed.data.tags), parsed.data.isTransfer ? 1 : 0, parsed.data.splits.length ? 1 : 0, id),
    db.prepare("DELETE FROM transaction_splits WHERE transaction_id = ?").bind(id),
  ];

  for (const split of parsed.data.splits) {
    statements.push(db.prepare(`INSERT INTO transaction_splits
      (id, transaction_id, amount_cents, category_id, entity_id, deductible_pct, note)
      VALUES (?, ?, ?, ?, ?, 0, ?)`)
      .bind(crypto.randomUUID(), id, split.amountCents, split.categoryId, split.entityId, split.note || null));
  }

  const merchantKey = existing.merchant_clean ?? existing.description_raw;
  if (parsed.data.categoryId) {
    statements.push(db.prepare(`INSERT INTO merchant_memory
      (id, merchant_key, category_id, bucket, entity_id, hit_count, last_used_at, confidence)
      VALUES (?, ?, ?, ?, ?, 1, unixepoch(), 100)
      ON CONFLICT(merchant_key) DO UPDATE SET
        category_id = excluded.category_id,
        bucket = excluded.bucket,
        entity_id = excluded.entity_id,
        hit_count = merchant_memory.hit_count + 1,
        last_used_at = unixepoch(),
        confidence = 100`)
      .bind(crypto.randomUUID(), merchantKey, parsed.data.categoryId, bucket, parsed.data.entityId));
  }

  if (parsed.data.createRule && parsed.data.categoryId) {
    statements.push(db.prepare(`INSERT INTO rules
      (id, priority, enabled, name, match_field, match_op, match_value, set_category_id, set_bucket, set_entity_id)
      VALUES (?, 100, 1, ?, 'merchant', 'equals', ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), `${merchantKey} → category`, merchantKey, parsed.data.categoryId, bucket, parsed.data.entityId));
  }

  await db.batch(statements);
  return NextResponse.json({ ok: true });
}

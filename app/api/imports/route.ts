import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabase, getDatabase } from "@/db/runtime";
import { normalizeMerchant } from "@/lib/merchant";

const transactionSchema = z.object({
  externalId: z.string().max(200).optional(),
  postedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountCents: z.number().int().safe(),
  descriptionRaw: z.string().min(1).max(500),
  merchantClean: z.string().max(250),
});

const requestSchema = z.object({
  accountId: z.string().min(1).max(100),
  transactions: z.array(transactionSchema).min(1).max(5000),
});

function fallbackExternalId(postedAt: string, amountCents: number, description: string) {
  return bytesToHex(sha256(utf8ToBytes(`${postedAt}|${amountCents}|${description.trim().toUpperCase()}`)));
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The import preview contains invalid rows." }, { status: 400 });

  await ensureDatabase();
  const db = getDatabase();
  const account = await db.prepare("SELECT id FROM accounts WHERE id = ? AND is_active = 1").bind(parsed.data.accountId).first();
  if (!account) return NextResponse.json({ error: "Choose an active account." }, { status: 400 });

  let imported = 0;
  let skipped = 0;
  for (let offset = 0; offset < parsed.data.transactions.length; offset += 75) {
    const rows = parsed.data.transactions.slice(offset, offset + 75);
    const results = await db.batch(rows.map((transaction) => {
      const externalId = transaction.externalId || fallbackExternalId(transaction.postedAt, transaction.amountCents, transaction.descriptionRaw);
      return db.prepare(`INSERT OR IGNORE INTO transactions (
        id, account_id, external_id, source, posted_at, amount_cents,
        description_raw, merchant_raw, merchant_clean, entity_id, entity_source,
        is_pending, is_transfer, user_locked
      ) VALUES (?, ?, ?, 'csv', ?, ?, ?, ?, ?, 'entity_personal', 'default', 0, 0, 0)`)
        .bind(crypto.randomUUID(), parsed.data.accountId, externalId, transaction.postedAt, transaction.amountCents, transaction.descriptionRaw, transaction.descriptionRaw, normalizeMerchant(transaction.descriptionRaw));
    }));
    for (const result of results) {
      if ((result.meta?.changes ?? 0) > 0) imported += 1;
      else skipped += 1;
    }
  }

  return NextResponse.json({ imported, skipped });
}

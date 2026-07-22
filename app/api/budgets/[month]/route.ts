import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabase, getDatabase } from "@/db/runtime";

const schema = z.object({
  totalCents: z.number().int().nonnegative(),
  lines: z.array(z.object({ categoryId: z.string().min(1), amountCents: z.number().int().nonnegative(), rolloverEnabled: z.boolean() })).max(200),
});

export async function PUT(request: Request, { params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || new Set(parsed.data.lines.map((line) => line.categoryId)).size !== parsed.data.lines.length) return NextResponse.json({ error: "Check the budget amounts." }, { status: 400 });
  await ensureDatabase();
  const db = getDatabase();
  const budgetMonth = `${month}-01`;
  const budgetId = `budget_${month.replace("-", "_")}`;
  const statements = [
    db.prepare(`INSERT INTO budgets (id, month, total_cents) VALUES (?, ?, ?)
      ON CONFLICT(month) DO UPDATE SET total_cents = excluded.total_cents`).bind(budgetId, budgetMonth, parsed.data.totalCents),
    db.prepare("DELETE FROM budget_lines WHERE budget_id = (SELECT id FROM budgets WHERE month = ?)").bind(budgetMonth),
    ...parsed.data.lines.filter((line) => line.amountCents > 0 || line.rolloverEnabled).map((line) => db.prepare(`INSERT INTO budget_lines
      (id, budget_id, category_id, amount_cents, rollover_enabled, rollover_cents)
      VALUES (?, (SELECT id FROM budgets WHERE month = ?), ?, ?, ?, 0)`)
      .bind(crypto.randomUUID(), budgetMonth, line.categoryId, line.amountCents, Number(line.rolloverEnabled))),
  ];
  await db.batch(statements);
  return NextResponse.json({ saved: true });
}

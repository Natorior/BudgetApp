import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabase, getDatabase } from "@/db/runtime";

const schema = z.object({ matchField: z.enum(["merchant", "description"]), matchOp: z.enum(["contains", "equals"]), matchValue: z.string().trim().max(120) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !parsed.data.matchValue) return NextResponse.json({ count: 0 });
  await ensureDatabase();
  const expression = parsed.data.matchField === "merchant" ? "COALESCE(merchant_clean, description_raw)" : "description_raw";
  const value = parsed.data.matchOp === "contains" ? `%${parsed.data.matchValue.toUpperCase()}%` : parsed.data.matchValue.toUpperCase();
  const comparison = parsed.data.matchOp === "contains" ? "LIKE" : "=";
  const row = await getDatabase().prepare(`SELECT COUNT(*) AS count FROM transactions WHERE UPPER(${expression}) ${comparison} ?`).bind(value).first<{ count: number }>();
  return NextResponse.json({ count: row?.count ?? 0 });
}

import { NextResponse } from "next/server";
import { getExportData } from "@/lib/queries";
import { transactionFiltersSchema } from "@/lib/transaction-filters";

export async function POST(request: Request) {
  const parsed = transactionFiltersSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the export filters." }, { status: 400 });
  const data = await getExportData(parsed.data);
  return NextResponse.json({ ...data, rows: data.rows.slice(0, 10) });
}

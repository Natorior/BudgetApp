import type { Metadata } from "next";
import { BudgetEditor } from "@/components/budget-editor";
import { PageHeader } from "@/components/page-header";
import { getBudgetEditorData, getHomeData } from "@/lib/queries";

export const metadata: Metadata = { title: "Budget" };

function shiftMonth(month: string, delta: number) {
  const [year, value] = month.split("-").map(Number);
  return new Date(Date.UTC(year, value - 1 + delta, 1)).toISOString().slice(0, 7);
}

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const requested = (await searchParams).month;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : currentMonth;
  const date = new Date(`${month}-02T12:00:00Z`);
  const days = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  const elapsed = month === currentMonth ? Math.round((new Date().getDate() * 100) / days) : month < currentMonth ? 100 : 0;
  const [budget, previous, home] = await Promise.all([getBudgetEditorData(month, "personal"), getBudgetEditorData(shiftMonth(month, -1), "personal"), getHomeData(month, "personal")]);
  return <><PageHeader title="Budget" /><BudgetEditor month={month} initialBudget={budget} previousBudget={previous} incomeCents={home.totals.incomeCents} spendCents={home.totals.spendCents} elapsedPercent={elapsed} /></>;
}

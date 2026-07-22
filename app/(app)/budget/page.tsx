import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PaceBar } from "@/components/pace-bar";
import { PageHeader } from "@/components/page-header";
import { formatCents, sumCents } from "@/lib/money";
import { getBudgetData } from "@/lib/queries";

export const metadata: Metadata = { title: "Budget" };

export default async function BudgetPage() {
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const label = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const elapsed = Math.round((now.getDate() * 100) / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
  const budget = await getBudgetData(month, "personal");
  const allocated = sumCents(budget.lines.map((line) => line.amountCents));
  const unallocated = budget.totalCents === null ? null : budget.totalCents - allocated;

  return (
    <>
      <PageHeader title="Budget" />
      <div className="month-picker"><button className="icon-button" aria-label="Previous month"><ChevronLeft /></button><span>{label}</span><button className="icon-button" aria-label="Next month"><ChevronRight /></button></div>
      <section className="hero-section compact">
        <p className="section-label">Monthly total</p>
        <p className="money section-number">{budget.totalCents === null ? "—" : formatCents(budget.totalCents, { hideZeroCents: true })}</p>
        <div className="allocation-track"><span style={{ width: `${budget.totalCents ? Math.min(100, Math.round((allocated * 100) / budget.totalCents)) : 0}%` }} /></div>
        <div className="allocation-caption"><span>{formatCents(allocated, { hideZeroCents: true })} allocated</span><span data-over={unallocated !== null && unallocated < 0 || undefined}>{unallocated === null ? "No budget" : unallocated < 0 ? `${formatCents(-unallocated, { hideZeroCents: true })} over-allocated` : `${formatCents(unallocated, { hideZeroCents: true })} unallocated`}</span></div>
      </section>
      <section className="statement-section budget-lines">
        <div className="section-heading"><h2>Categories</h2><span>{elapsed}% through month</span></div>
        {budget.lines.map((line) => <PaceBar key={line.id} name={line.name} spentCents={line.spentCents} budgetCents={line.amountCents} elapsedPercent={elapsed} colorToken={line.colorToken} />)}
      </section>
    </>
  );
}

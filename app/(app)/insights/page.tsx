import type { Metadata } from "next";
import { MonthRail } from "@/components/month-rail";
import { InsightsCharts } from "@/components/insights-charts";
import { PageHeader } from "@/components/page-header";
import { ScopeSwitcher } from "@/components/scope-switcher";
import { formatCents, sumCents } from "@/lib/money";
import { getInsightData } from "@/lib/queries";
import { parseScope } from "@/lib/scope";

export const metadata: Metadata = { title: "Insights" };

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const params = await searchParams;
  const scope = parseScope(params.scope);
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const data = await getInsightData(month, scope);
  const recurringMonthly = -sumCents(data.recurring.map((item) => item.amountCents));
  return (
    <>
      <PageHeader title="Insights"><ScopeSwitcher value={scope} /></PageHeader>
      <MonthRail monthLabel={now.toLocaleDateString("en-US", { month: "long" })} day={now.getDate()} daysInMonth={days} incomeCents={data.totals.incomeCents} spendCents={data.totals.spendCents} budgetCents={scope === "business" ? null : data.budgetCents} />
      <InsightsCharts cashFlow={data.cashFlow} categorySpend={data.categorySpend} />
      <section className="statement-section">
        <div className="section-heading"><h2>Recurring</h2><span className="money">{formatCents(recurringMonthly, { hideZeroCents: true })}/mo</span></div>
        {data.recurring.map((item) => <div className="account-row" key={item.merchant}><span><strong>{item.merchant}</strong><small>{item.cadence} · next {item.nextExpectedAt ?? "—"}</small></span><span className="money">{formatCents(item.amountCents)}</span></div>)}
      </section>
      {data.insights.length ? <section className="statement-section"><div className="section-heading"><h2>Monthly read</h2></div>{data.insights.map((insight) => <article className="insight-card" key={insight.title}><span className="eyebrow">Computed from July data</span><h3>{insight.title}</h3><p>{insight.body}</p></article>)}</section> : null}
    </>
  );
}

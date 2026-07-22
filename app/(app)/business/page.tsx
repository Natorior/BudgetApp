import type { Metadata } from "next";
import Link from "next/link";
import { BusinessChart } from "@/components/business-chart";
import { PageHeader } from "@/components/page-header";
import { formatCents } from "@/lib/money";
import { getBusinessData } from "@/lib/queries";

export const metadata: Metadata = { title: "Business" };

export default async function BusinessPage({ searchParams }: { searchParams: Promise<{ year?: string; quarter?: string }> }) {
  const params = await searchParams;
  const year = params.year && /^\d{4}$/.test(params.year) ? params.year : String(new Date().getFullYear());
  const quarter = params.quarter && /^(all|q[1-4])$/.test(params.quarter) ? params.quarter : "all";
  const data = await getBusinessData(year, quarter);
  return <><PageHeader title="Business" /><div className="period-switcher" aria-label="Reporting period">{["all", "q1", "q2", "q3", "q4"].map((value) => <Link key={value} href={`/business?year=${year}&quarter=${value}`} data-selected={quarter === value || undefined}>{value === "all" ? year : value.toUpperCase()}</Link>)}</div>
    <section className="business-hero"><p className="eyebrow">Net profit · {data.entityName}</p><p className="money hero-number" data-positive={data.profitCents >= 0 || undefined}>{formatCents(data.profitCents, { showPositiveSign: data.profitCents > 0 })}</p><div className="business-totals"><span><small>Revenue</small><strong className="money">{formatCents(data.revenueCents)}</strong></span><span><small>Expenses</small><strong className="money">{formatCents(data.expenseCents)}</strong></span></div></section>
    <section className="statement-section"><div className="section-heading"><h2>Revenue vs expenses</h2></div>{data.monthly.length ? <BusinessChart data={data.monthly} /> : <div className="empty-state"><h2>No activity</h2><p>No posted business transactions in this period.</p></div>}</section>
    <section className="statement-section"><div className="section-heading"><h2>Revenue by source</h2></div>{data.revenue.map((row) => <div className="account-row" key={row.name}><span>{row.name}</span><span className="money">{formatCents(row.amountCents)}</span></div>)}</section>
    <section className="statement-section"><div className="section-heading"><h2>Schedule C expense view</h2></div>{data.expenses.map((row) => <div className="tax-row" key={`${row.label}-${row.scheduleCLine}`}><span><strong>{row.label}</strong><small>{row.scheduleCLine ? `Schedule C line ${row.scheduleCLine}` : "Assign a tax category"}</small></span><span><strong className="money">{formatCents(row.amountCents)}</strong><small>{formatCents(row.deductibleCents)} deductible</small></span></div>)}</section>
    <section className="reserve-card"><p className="eyebrow">Planning reserve · {data.setAsidePct}% of revenue</p><p className="money section-number">{formatCents(data.reserveCents)}</p><p>This is a set-aside target for planning, not a calculated tax liability.</p></section>
  </>;
}

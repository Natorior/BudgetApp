import Link from "next/link";
import { ArrowRight, CircleHelp } from "lucide-react";
import { MonthRail } from "@/components/month-rail";
import { PageHeader } from "@/components/page-header";
import { ScopeSwitcher } from "@/components/scope-switcher";
import { TransactionRow } from "@/components/transaction-row";
import { formatCents, sumCents } from "@/lib/money";
import { getHomeData } from "@/lib/queries";
import { parseScope } from "@/lib/scope";

function monthContext() {
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  return {
    month,
    label: now.toLocaleDateString("en-US", { month: "long" }),
    day: now.getDate(),
    days: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
  };
}

export default async function Home({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const params = await searchParams;
  const scope = parseScope(params.scope);
  const calendar = monthContext();
  const [data, personal] = await Promise.all([getHomeData(calendar.month, scope), getHomeData(calendar.month, "personal")]);
  const safeCents = personal.budgetCents === null ? null : Math.max(0, personal.budgetCents - personal.totals.spendCents);
  const daysRemaining = Math.max(1, calendar.days - calendar.day + 1);
  const dailyCents = safeCents === null ? null : Math.trunc(safeCents / daysRemaining);
  const netWorth = sumCents(data.accounts.map((account) => account.balanceCents ?? 0));

  return (
    <>
      <PageHeader eyebrow={scope === "business" ? "Business · Game development" : calendar.label}>
        <ScopeSwitcher value={scope} />
      </PageHeader>

      <section className="hero-section">
        <p className="section-label">Net this month</p>
        <p className="money hero-number" data-positive={data.totals.netCents > 0 || undefined}>{formatCents(data.totals.netCents, { showPositiveSign: data.totals.netCents > 0, hideZeroCents: true })}</p>
        <p className="hero-caption"><span>{formatCents(data.totals.incomeCents, { hideZeroCents: true })} in</span><span aria-hidden="true">·</span><span>{formatCents(data.totals.spendCents, { hideZeroCents: true })} out</span></p>
      </section>

      <MonthRail monthLabel={calendar.label} day={calendar.day} daysInMonth={calendar.days} incomeCents={data.totals.incomeCents} spendCents={data.totals.spendCents} budgetCents={scope === "business" ? null : data.budgetCents} />

      {data.reviewCount > 0 ? (
        <Link className="review-link" href="/transactions?review=1"><span>{data.reviewCount} to review</span><ArrowRight size={18} aria-hidden="true" /></Link>
      ) : null}

      <section className="statement-section">
        <div className="section-heading"><h2>Safe to spend</h2><button className="icon-button" aria-label="How safe to spend is calculated"><CircleHelp size={18} /></button></div>
        <p className="money section-number">{safeCents === null ? "—" : formatCents(safeCents, { hideZeroCents: true })}</p>
        <p className="muted">{dailyCents === null ? "Set a personal budget to calculate this." : `${formatCents(dailyCents, { hideZeroCents: true })}/day for ${daysRemaining} days`}</p>
      </section>

      <section className="statement-section">
        <div className="section-heading"><h2>Accounts</h2><span className="money">{formatCents(netWorth, { hideZeroCents: true })}</span></div>
        <div className="account-list">
          {data.accounts.map((account) => <div className="account-row" key={account.id}><span>{account.name}</span><span className="money">{account.balanceCents === null ? "—" : formatCents(account.balanceCents, { hideZeroCents: true })}</span></div>)}
        </div>
      </section>

      <section className="statement-section recent-section">
        <div className="section-heading"><h2>Recent</h2><Link href="/transactions">View all</Link></div>
        <div className="transaction-list">{data.recent.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}</div>
      </section>
      <p className="demo-note">Demo data · replace it by importing a bank CSV in Settings.</p>
    </>
  );
}

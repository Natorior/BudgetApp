"use client";

import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type CashRow = { month: string; incomeCents: number; spendCents: number; netCents: number };
type CategoryRow = { month: string; category: string; colorToken: string; spentCents: number };
const chartColors = ["var(--category-1)", "var(--category-2)", "var(--category-3)", "var(--category-4)", "var(--category-5)", "var(--category-6)", "var(--category-7)", "var(--category-8)"];
const label = (month: string) => new Date(`${month}-02T12:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
const tooltipValue = (value: unknown) => `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function InsightsCharts({ cashFlow, categorySpend }: { cashFlow: CashRow[]; categorySpend: CategoryRow[] }) {
  const cash = cashFlow.map((row) => ({ month: label(row.month), income: row.incomeCents / 100, spend: row.spendCents / 100, net: row.netCents / 100 }));
  const totals = new Map<string, number>(); for (const row of categorySpend) totals.set(row.category, (totals.get(row.category) ?? 0) + row.spentCents);
  const categories = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name]) => name);
  const byMonth = new Map<string, Record<string, string | number>>();
  for (const row of categorySpend) { if (!byMonth.has(row.month)) byMonth.set(row.month, { month: label(row.month) }); const item = byMonth.get(row.month)!; const key = categories.includes(row.category) ? row.category : "Other"; item[key] = Number(item[key] ?? 0) + row.spentCents / 100; }
  return <>
    <section className="statement-section"><div className="section-heading"><h2>Cash flow</h2><span>12 months</span></div><div className="insights-chart" aria-label="Cash flow over twelve months"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={cash} margin={{ top: 12, right: 0, bottom: 0, left: -16 }}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} /><Tooltip formatter={tooltipValue} contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", borderRadius: 8 }} /><Bar dataKey="income" fill="var(--positive)" name="Income" radius={[3, 3, 0, 0]} /><Bar dataKey="spend" fill="var(--category-3)" name="Spend" radius={[3, 3, 0, 0]} /><Line dataKey="net" stroke="var(--accent)" strokeWidth={2} dot={false} name="Net" /></ComposedChart></ResponsiveContainer></div></section>
    <section className="statement-section"><div className="section-heading"><h2>Category spend</h2><span>6 months</span></div>{byMonth.size ? <div className="insights-chart tall" aria-label="Spending by category over six months"><ResponsiveContainer width="100%" height="100%"><BarChart data={[...byMonth.values()]} margin={{ top: 12, right: 0, bottom: 0, left: -16 }}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} /><Tooltip formatter={tooltipValue} contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", borderRadius: 8 }} /><Legend wrapperStyle={{ fontSize: 11 }} />{[...categories, ...(categorySpend.some((row) => !categories.includes(row.category)) ? ["Other"] : [])].map((category, index) => <Bar key={category} dataKey={category} stackId="spend" fill={chartColors[index % chartColors.length]} />)}</BarChart></ResponsiveContainer></div> : <div className="empty-state"><h2>No spending trend yet</h2><p>Imported posted expenses will appear here.</p></div>}</section>
  </>;
}

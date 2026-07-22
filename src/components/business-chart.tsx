"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCents } from "@/lib/money";

export function BusinessChart({ data }: { data: { month: string; revenueCents: number; expenseCents: number }[] }) {
  const chart = data.map((row) => ({ ...row, label: new Date(`${row.month}-02T12:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }), revenue: row.revenueCents / 100, expense: row.expenseCents / 100 }));
  return <div className="business-chart" aria-label="Monthly revenue and expenses chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ top: 12, right: 0, bottom: 0, left: -16 }}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} /><Tooltip cursor={{ fill: "var(--accent-quiet)" }} contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", borderRadius: 8 }} formatter={(value) => formatCents(Math.round(Number(value) * 100), { hideZeroCents: true })} /><Bar dataKey="revenue" name="Revenue" fill="var(--positive)" radius={[3, 3, 0, 0]} /><Bar dataKey="expense" name="Expenses" fill="var(--category-3)" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>;
}

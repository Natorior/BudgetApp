"use client";

import { ChevronLeft, ChevronRight, Copy, Save } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatCents, sumCents, toCents } from "@/lib/money";
import { PaceBar } from "./pace-bar";

type BudgetLine = { categoryId: string; name: string; colorToken: string; bucket: string; amountCents: number; spentCents: number; rolloverEnabled: boolean; rolloverCents: number };
type BudgetData = { totalCents: number | null; lines: BudgetLine[] };

function shiftMonth(month: string, delta: number) {
  const [year, value] = month.split("-").map(Number);
  return new Date(Date.UTC(year, value - 1 + delta, 1)).toISOString().slice(0, 7);
}

function editLines(lines: BudgetLine[]) { return lines.map((line) => ({ ...line, amount: (line.amountCents / 100).toFixed(2) })); }

export function BudgetEditor({ month, initialBudget, previousBudget, incomeCents, spendCents, elapsedPercent }: { month: string; initialBudget: BudgetData; previousBudget: BudgetData; incomeCents: number; spendCents: number; elapsedPercent: number }) {
  const [total, setTotal] = useState(initialBudget.totalCents === null ? "" : (initialBudget.totalCents / 100).toFixed(2));
  const [lines, setLines] = useState(editLines(initialBudget.lines));
  const [busy, setBusy] = useState(false);
  const allocated = useMemo(() => {
    try { return sumCents(lines.map((line) => toCents(line.amount || "0"))); } catch { return null; }
  }, [lines]);
  const totalCents = useMemo(() => { try { return total ? toCents(total) : null; } catch { return null; } }, [total]);
  const unallocated = totalCents === null || allocated === null ? null : totalCents - allocated;
  const label = new Date(`${month}-02T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  function updateLine(categoryId: string, changes: Partial<(typeof lines)[number]>) { setLines((current) => current.map((line) => line.categoryId === categoryId ? { ...line, ...changes } : line)); }
  function copyPrevious() {
    if (previousBudget.totalCents === null) { toast.error("The previous month has no budget to copy."); return; }
    setTotal((previousBudget.totalCents / 100).toFixed(2));
    const previousByCategory = new Map(previousBudget.lines.map((line) => [line.categoryId, line]));
    setLines((current) => current.map((line) => { const previous = previousByCategory.get(line.categoryId); return { ...line, amount: ((previous?.amountCents ?? 0) / 100).toFixed(2), rolloverEnabled: previous?.rolloverEnabled ?? false }; }));
    toast.success("Copied last month. Save when it looks right.");
  }
  async function save() {
    if (totalCents === null || totalCents < 0 || allocated === null) { toast.error("Check the budget amounts."); return; }
    setBusy(true);
    const response = await fetch(`/api/budgets/${month}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ totalCents, lines: lines.map((line) => ({ categoryId: line.categoryId, amountCents: toCents(line.amount || "0"), rolloverEnabled: line.rolloverEnabled })) }) });
    if (!response.ok) toast.error(((await response.json()) as { error?: string }).error ?? "Unable to save budget."); else toast.success("Budget saved");
    setBusy(false);
  }

  const bucketRows = [
    { label: "Needs", bucket: "need" }, { label: "Wants", bucket: "want" },
  ].map((item) => ({ ...item, plan: sumCents(lines.filter((line) => line.bucket === item.bucket).map((line) => { try { return toCents(line.amount || "0"); } catch { return 0; } })), actual: sumCents(lines.filter((line) => line.bucket === item.bucket).map((line) => line.spentCents)) }));

  return <>
    <div className="month-picker"><Link className="icon-button" href={`/budget?month=${shiftMonth(month, -1)}`} aria-label="Previous month"><ChevronLeft /></Link><span>{label}</span><Link className="icon-button" href={`/budget?month=${shiftMonth(month, 1)}`} aria-label="Next month"><ChevronRight /></Link></div>
    <section className="budget-actions"><button className="secondary-button" type="button" onClick={copyPrevious}><Copy size={17} /> Copy last month</button><button className="primary-button" type="button" disabled={busy} onClick={save}><Save size={17} /> {busy ? "Saving…" : "Save"}</button></section>
    <section className="hero-section compact budget-total-editor"><label className="field-label">Monthly total<div className="money-field"><span>$</span><input inputMode="decimal" value={total} onChange={(event) => setTotal(event.target.value)} placeholder="0.00" aria-label="Monthly budget total" /></div></label><div className="allocation-track"><span style={{ width: `${totalCents && allocated !== null ? Math.min(100, Math.round((allocated * 100) / totalCents)) : 0}%` }} /></div><div className="allocation-caption"><span>{allocated === null ? "Check amounts" : `${formatCents(allocated, { hideZeroCents: true })} allocated`}</span><span data-over={unallocated !== null && unallocated < 0 || undefined}>{unallocated === null ? "No budget" : unallocated < 0 ? `${formatCents(-unallocated, { hideZeroCents: true })} over-allocated` : `${formatCents(unallocated, { hideZeroCents: true })} unallocated`}</span></div></section>
    <section className="bucket-summary"><div className="section-heading"><h2>Plan vs actual</h2></div>{bucketRows.map((row) => <div className="summary-row" key={row.bucket}><span>{row.label}</span><span className="money">{formatCents(row.plan, { hideZeroCents: true })} plan</span><span className="money">{formatCents(row.actual, { hideZeroCents: true })} actual</span></div>)}<div className="summary-row"><span>Savings</span><span className="money">{totalCents === null || allocated === null ? "—" : formatCents(totalCents - allocated, { hideZeroCents: true })} plan</span><span className="money">{formatCents(incomeCents - spendCents, { hideZeroCents: true })} actual</span></div></section>
    <section className="statement-section budget-lines"><div className="section-heading"><h2>Categories</h2><span>{elapsedPercent}% through month</span></div>{lines.map((line) => <div className="editable-budget-line" key={line.categoryId}><PaceBar name={line.name} spentCents={line.spentCents} budgetCents={(() => { try { return toCents(line.amount || "0"); } catch { return 0; } })()} elapsedPercent={elapsedPercent} colorToken={line.colorToken} /><div className="budget-line-controls"><label className="money-field"><span>$</span><input aria-label={`${line.name} budget`} inputMode="decimal" value={line.amount} onChange={(event) => updateLine(line.categoryId, { amount: event.target.value })} /></label><label className="check-row"><input type="checkbox" checked={line.rolloverEnabled} onChange={(event) => updateLine(line.categoryId, { rolloverEnabled: event.target.checked })} /><span>Rollover</span></label></div>{line.rolloverEnabled && line.rolloverCents ? <small className="rollover-note">{formatCents(line.rolloverCents)} carried in</small> : null}</div>)}</section>
  </>;
}

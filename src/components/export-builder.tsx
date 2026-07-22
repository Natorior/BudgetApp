"use client";

import { Download, FileJson, Sheet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatCents } from "@/lib/money";
import { defaultTransactionFilters, type TransactionFilters } from "@/lib/transaction-filters";

type Option = { id: string; name: string };
type Category = Option & { default_bucket: string };
type Preview = { rows: Record<string, unknown>[]; totals: { count: number; inflowsCents: number; outflowsCents: number; netCents: number }; startDate: string | null; endDate: string | null };

function toggle(list: string[], id: string) { return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]; }

export function ExportBuilder({ categories, accounts }: { categories: Category[]; accounts: Option[] }) {
  const now = new Date();
  const [filters, setFilters] = useState<TransactionFilters>({ ...defaultTransactionFilters, startDate: `${now.getFullYear()}-01-01`, endDate: now.toISOString().slice(0, 10), pending: "exclude", transfers: "exclude", ignored: "exclude" });
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const scope = filters.entityIds.length === 1 && filters.entityIds[0] === "entity_personal" ? "personal" : filters.entityIds.length === 1 && filters.entityIds[0] === "entity_business" ? "business" : "all";

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const response = await fetch("/api/exports/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(filters), signal: controller.signal });
      if (!response.ok) { setError("Unable to preview this export."); return; }
      setPreview(await response.json() as Preview); setError("");
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [filters]);

  const chosenSummary = useMemo(() => ({ categories: filters.categoryIds.length ? `${filters.categoryIds.length} selected` : "All categories", accounts: filters.accountIds.length ? `${filters.accountIds.length} selected` : "All accounts" }), [filters]);
  function patch(changes: Partial<TransactionFilters>) { setFilters((current) => ({ ...current, ...changes })); }

  async function download() {
    setBusy(true); setError("");
    const response = await fetch("/api/exports/download", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ format, filters }) });
    if (!response.ok) { setError(((await response.json()) as { error?: string }).error ?? "Unable to create export."); setBusy(false); return; }
    const blob = await response.blob(); const url = window.URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = response.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] ?? `ledger.${format}`; anchor.click(); window.URL.revokeObjectURL(url); setBusy(false);
  }

  return <div className="export-builder">
    <section className="export-card"><p className="eyebrow">Scope</p><div className="scope-switcher" role="group" aria-label="Export scope">{["all", "personal", "business"].map((value) => <button key={value} type="button" data-selected={scope === value || undefined} onClick={() => patch({ entityIds: value === "all" ? [] : [value === "personal" ? "entity_personal" : "entity_business"] })}>{value[0]?.toUpperCase()}{value.slice(1)}</button>)}</div>
      <div className="editor-grid export-dates"><label className="field-label">From<input type="date" value={filters.startDate ?? ""} onChange={(event) => patch({ startDate: event.target.value || null })} /></label><label className="field-label">Through<input type="date" value={filters.endDate ?? ""} onChange={(event) => patch({ endDate: event.target.value || null })} /></label></div>
    </section>
    <section className="export-card"><div className="section-heading"><h2>What to include</h2><span>Empty selection means all</span></div><details><summary>{chosenSummary.categories}</summary><div className="export-checks">{categories.map((category) => <label className="check-row" key={category.id}><input type="checkbox" checked={filters.categoryIds.includes(category.id)} onChange={() => patch({ categoryIds: toggle(filters.categoryIds, category.id) })} /><span>{category.name}</span></label>)}</div></details><details><summary>{chosenSummary.accounts}</summary><div className="export-checks">{accounts.map((account) => <label className="check-row" key={account.id}><input type="checkbox" checked={filters.accountIds.includes(account.id)} onChange={() => patch({ accountIds: toggle(filters.accountIds, account.id) })} /><span>{account.name}</span></label>)}</div></details>
      <label className="check-row"><input type="checkbox" checked={filters.pending === "include"} onChange={(event) => patch({ pending: event.target.checked ? "include" : "exclude" })} /><span>Include pending</span></label><label className="check-row"><input type="checkbox" checked={filters.transfers === "include"} onChange={(event) => patch({ transfers: event.target.checked ? "include" : "exclude" })} /><span>Include transfers</span></label><label className="check-row"><input type="checkbox" checked={filters.ignored === "include"} onChange={(event) => patch({ ignored: event.target.checked ? "include" : "exclude" })} /><span>Include ignored</span></label>
    </section>
    <section className="export-card"><p className="eyebrow">Format</p><div className="format-picker"><button type="button" data-selected={format === "csv" || undefined} onClick={() => setFormat("csv")}><Sheet size={20} /><span><strong>Flat CSV</strong><small>Spreadsheet-ready</small></span></button><button type="button" data-selected={format === "json" || undefined} onClick={() => setFormat("json")}><FileJson size={20} /><span><strong>JSON</strong><small>Full-fidelity backup</small></span></button></div></section>
    <section className="export-preview"><div className="section-heading"><h2>Preview</h2><span>{preview?.totals.count ?? "—"} rows</span></div>{preview ? <><div className="preview-totals"><span><small>Inflows</small><strong className="money">{formatCents(preview.totals.inflowsCents)}</strong></span><span><small>Outflows</small><strong className="money">{formatCents(preview.totals.outflowsCents)}</strong></span><span><small>Net</small><strong className="money">{formatCents(preview.totals.netCents, { showPositiveSign: preview.totals.netCents > 0 })}</strong></span></div><p className="export-range">{preview.startDate ?? "—"} through {preview.endDate ?? "—"}</p>{preview.rows.slice(0, 5).map((row) => <div className="preview-row" key={String(row.transaction_id)}><span><strong>{String(row.merchant)}</strong><small>{String(row.posted_date)} · {String(row.category || "Uncategorized")}</small></span><span className="money">{String(row.amount)}</span></div>)}</> : <p className="export-range">Calculating preview…</p>}</section>
    {error ? <p className="form-error" role="alert">{error}</p> : null}<button className="primary-button export-download" type="button" disabled={busy || !preview?.totals.count} onClick={download}><Download size={18} /> {busy ? "Preparing…" : `Download ${format.toUpperCase()}`}</button>
  </div>;
}

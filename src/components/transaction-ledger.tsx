"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { toCents } from "@/lib/money";
import type { TransactionListItem } from "@/lib/queries";
import { defaultTransactionFilters, matchesTransaction, type TransactionFilters } from "@/lib/transaction-filters";
import { TransactionRow } from "./transaction-row";

type Category = { id: string; name: string; default_bucket: string; color_token: string };
type Entity = { id: string; name: string; kind: string };
type Account = { id: string; name: string };

export function TransactionLedger({ initialTransactions, categories, entities, accounts, reviewOnly = false }: {
  initialTransactions: TransactionListItem[];
  categories: Category[];
  entities: Entity[];
  accounts: Account[];
  reviewOnly?: boolean;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(reviewOnly);
  const [categoryId, setCategoryId] = useState(reviewOnly ? "uncategorized" : "all");
  const [accountId, setAccountId] = useState("all");
  const [bucket, setBucket] = useState("all");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minimumAmount, setMinimumAmount] = useState("");
  const [maximumAmount, setMaximumAmount] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const filters = useMemo<TransactionFilters>(() => ({
    ...defaultTransactionFilters, search, startDate: startDate || null, endDate: endDate || null,
    minimumAmountCents: (() => { try { return minimumAmount ? toCents(minimumAmount) : null; } catch { return Number.MAX_SAFE_INTEGER; } })(),
    maximumAmountCents: (() => { try { return maximumAmount ? toCents(maximumAmount) : null; } catch { return Number.MIN_SAFE_INTEGER; } })(),
    accountIds: accountId === "all" ? [] : [accountId], categoryIds: categoryId === "all" ? [] : [categoryId],
    buckets: bucket === "all" ? [] : [bucket as TransactionFilters["buckets"][number]], pending: pendingOnly ? "only" : "include",
  }), [search, startDate, endDate, minimumAmount, maximumAmount, accountId, categoryId, bucket, pendingOnly]);
  const filtered = useMemo(() => transactions.filter((transaction) => matchesTransaction(transaction, filters)), [transactions, filters]);

  const virtualizer = useWindowVirtualizer({
    count: filtered.length,
    estimateSize: () => 64,
    overscan: 10,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  async function bulkUpdate(update: { categoryId?: string | null; entityId?: string }) {
    const ids = [...selected];
    if (!ids.length) return;
    const response = await fetch("/api/transactions/bulk", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids, ...update }) });
    const body = await response.json() as { error?: string };
    if (!response.ok) { toast.error(body.error ?? "Bulk update failed."); return; }
    const category = update.categoryId ? categories.find((item) => item.id === update.categoryId) : null;
    const entity = update.entityId ? entities.find((item) => item.id === update.entityId) : null;
    setTransactions((current) => current.map((transaction) => selected.has(transaction.id) ? {
      ...transaction,
      ...(category ? { categoryId: category.id, category: category.name, bucket: category.default_bucket } : {}),
      ...(entity ? { entityId: entity.id, entity: entity.name } : {}),
    } : transaction));
    setSelected(new Set());
    toast.success(`${ids.length} transactions updated`);
  }

  return (
    <>
      <div className="search-row">
        <label className="search-input"><Search size={18} aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search merchants" aria-label="Search transactions" /></label>
        <button className="icon-button bordered" type="button" aria-label={showFilters ? "Close filters" : "Open filters"} onClick={() => setShowFilters((value) => !value)}>{showFilters ? <X size={19} /> : <SlidersHorizontal size={19} />}</button>
      </div>
      {showFilters ? <div className="filter-panel"><label>Category<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="all">All categories</option><option value="uncategorized">Uncategorized only</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Account<select value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="all">All accounts</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label>Bucket<select value={bucket} onChange={(event) => setBucket(event.target.value)}><option value="all">All buckets</option><option value="need">Needs</option><option value="want">Wants</option><option value="save">Savings</option><option value="income">Income</option><option value="transfer">Transfers</option><option value="ignore">Ignored</option></select></label><label className="check-row"><input type="checkbox" checked={pendingOnly} onChange={(event) => setPendingOnly(event.target.checked)} /><span>Pending only</span></label><label>From<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Through<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><label>Minimum amount<input inputMode="decimal" placeholder="-100.00" value={minimumAmount} onChange={(event) => setMinimumAmount(event.target.value)} /></label><label>Maximum amount<input inputMode="decimal" placeholder="500.00" value={maximumAmount} onChange={(event) => setMaximumAmount(event.target.value)} /></label></div> : null}
      <p className="result-count">{filtered.length} transactions</p>
      <div ref={listRef} className="virtual-ledger" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const transaction = filtered[virtualRow.index];
          if (!transaction) return null;
          return <div className="virtual-row" key={transaction.id} style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)` }}><TransactionRow transaction={transaction} href={`/transactions/${transaction.id}`} selectable selected={selected.has(transaction.id)} onSelect={(checked) => toggle(transaction.id, checked)} /></div>;
        })}
      </div>
      {!filtered.length ? <div className="empty-state"><h2>No matching transactions</h2><p>Change or clear the current filters.</p></div> : null}
      {selected.size ? <div className="bulk-bar" role="region" aria-label="Bulk transaction actions"><span>{selected.size} selected</span><select aria-label="Recategorize selected transactions" defaultValue="" onChange={(event) => { if (event.target.value) bulkUpdate({ categoryId: event.target.value }); event.target.value = ""; }}><option value="">Recategorize</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><button type="button" onClick={() => bulkUpdate({ entityId: "entity_business" })}>To business</button><button type="button" onClick={() => bulkUpdate({ entityId: "entity_personal" })}>To personal</button></div> : null}
    </>
  );
}

"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatCents } from "@/lib/money";

type ReviewTransaction = { id: string; merchant: string; descriptionRaw: string; postedAt: string; amountCents: number; accountName: string; entityId: string };
type Category = { id: string; name: string; default_bucket: string; color_token: string };
type Entity = { id: string; name: string; kind: string };

const likelyNames = ["Groceries", "Dining Out", "Shopping", "Subscriptions", "Gaming", "Transfer"];

export function ReviewQueue({ initialTransactions, categories, entities }: { initialTransactions: ReviewTransaction[]; categories: Category[]; entities: Entity[] }) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [index, setIndex] = useState(0);
  const [entityId, setEntityId] = useState(initialTransactions[0]?.entityId ?? "entity_personal");
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const transaction = transactions[index];
  const likely = categories.filter((category) => likelyNames.includes(category.name));

  async function choose(category: Category) {
    if (!transaction) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/transactions/${transaction.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ categoryId: category.id, bucket: category.default_bucket, entityId, notes: "", tags: [], isTransfer: category.default_bucket === "transfer", createRule: false, splits: [] }) });
    const body = await response.json() as { error?: string };
    if (!response.ok) { setError(body.error ?? "Unable to save."); setBusy(false); return; }
    setTransactions((current) => current.filter((item) => item.id !== transaction.id));
    setIndex(0);
    setEntityId(transactions.find((item) => item.id !== transaction.id)?.entityId ?? "entity_personal");
    setBusy(false);
  }

  if (!transaction) return <div className="review-complete"><p className="eyebrow">Review complete</p><h1>Everything has a place.</h1><p>The current queue is clear.</p><Link className="primary-button" href="/transactions">Return to transactions</Link></div>;

  return (
    <div className="review-queue">
      <div className="review-progress"><span>{index + 1} of {transactions.length}</span><button type="button" onClick={() => { if (index < transactions.length - 1) { const next = index + 1; setIndex(next); setEntityId(transactions[next]?.entityId ?? "entity_personal"); } }} disabled={index >= transactions.length - 1}>Skip <ArrowRight size={16} /></button></div>
      <section className="review-card">
        <p className="eyebrow">{transaction.accountName} · {transaction.postedAt}</p>
        <h1>{transaction.merchant}</h1>
        <p className="money review-amount">{formatCents(transaction.amountCents, { showPositiveSign: transaction.amountCents > 0 })}</p>
        <p className="review-description">{transaction.descriptionRaw}</p>
      </section>
      <fieldset className="entity-field"><legend>Assign to</legend><div className="entity-control">{entities.map((entity) => <button key={entity.id} type="button" data-selected={entityId === entity.id || undefined} onClick={() => setEntityId(entity.id)}>{entity.name}</button>)}</div></fieldset>
      <section className="review-categories"><div className="section-heading"><h2>Choose category</h2><button type="button" onClick={() => setShowAll((value) => !value)}><Search size={16} /> {showAll ? "Likely" : "All"}</button></div><div className="category-button-grid">{(showAll ? categories : likely).map((category) => <button key={category.id} type="button" disabled={busy} onClick={() => choose(category)}>{category.name}</button>)}</div></section>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}

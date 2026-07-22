"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { formatCents, toCents } from "@/lib/money";

type Category = { id: string; name: string; default_bucket: string; color_token: string };
type Entity = { id: string; name: string; kind: string };
type Split = { id?: string; amount: string; categoryId: string; entityId: string; note: string };
type Transaction = {
  id: string; merchant: string; descriptionRaw: string; accountName: string; postedAt: string;
  amountCents: number; categoryId: string | null; bucket: string | null; entityId: string;
  notes: string; tags: string[]; isPending: boolean; isTransfer: boolean;
  splits: { id: string; amountCents: number; categoryId: string | null; entityId: string; note: string }[];
};

function splitFromTransaction(transaction: Transaction): Split[] {
  if (transaction.splits.length) return transaction.splits.map((split) => ({ id: split.id, amount: formatCents(split.amountCents).replace("$", ""), categoryId: split.categoryId ?? "", entityId: split.entityId, note: split.note }));
  return [
    { amount: formatCents(transaction.amountCents).replace("$", ""), categoryId: transaction.categoryId ?? "", entityId: transaction.entityId, note: "" },
    { amount: "0.00", categoryId: transaction.categoryId ?? "", entityId: transaction.entityId, note: "" },
  ];
}

export function TransactionEditor({ transaction, categories, entities }: { transaction: Transaction; categories: Category[]; entities: Entity[] }) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(transaction.categoryId ?? "");
  const [entityId, setEntityId] = useState(transaction.entityId);
  const [notes, setNotes] = useState(transaction.notes);
  const [tags, setTags] = useState(transaction.tags.join(", "));
  const [isTransfer, setIsTransfer] = useState(transaction.isTransfer);
  const [createRule, setCreateRule] = useState(false);
  const [splitMode, setSplitMode] = useState(transaction.splits.length > 0);
  const [splits, setSplits] = useState<Split[]>(splitFromTransaction(transaction));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const remainder = useMemo(() => {
    if (!splitMode) return 0;
    try { return transaction.amountCents - splits.reduce((total, split) => total + toCents(split.amount || "0"), 0); }
    catch { return null; }
  }, [splitMode, splits, transaction.amountCents]);

  function updateSplit(index: number, update: Partial<Split>) {
    setSplits((current) => current.map((split, splitIndex) => splitIndex === index ? { ...split, ...update } : split));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      if (splitMode && remainder !== 0) throw new Error("Splits must reconcile to the original amount.");
      const category = categories.find((item) => item.id === categoryId);
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          categoryId: categoryId || null,
          bucket: isTransfer ? "transfer" : category?.default_bucket ?? transaction.bucket,
          entityId,
          notes,
          tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          isTransfer,
          createRule,
          splits: splitMode ? splits.map((split) => ({ amountCents: toCents(split.amount || "0"), categoryId: split.categoryId || null, entityId: split.entityId, note: split.note })) : [],
        }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to save this transaction.");
      router.push("/transactions");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save this transaction.");
      setBusy(false);
    }
  }

  return (
    <form className="transaction-editor" onSubmit={save}>
      <section className="detail-hero">
        <p className="eyebrow">{transaction.accountName} · {transaction.postedAt}</p>
        <h1>{transaction.merchant}</h1>
        <p className="money detail-amount">{formatCents(transaction.amountCents, { showPositiveSign: transaction.amountCents > 0 })}</p>
        <p className="detail-description">{transaction.descriptionRaw}</p>
      </section>
      <label className="field-label">Category<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <fieldset className="entity-field"><legend>Entity</legend><div className="entity-control">{entities.map((entity) => <button key={entity.id} type="button" data-selected={entityId === entity.id || undefined} onClick={() => setEntityId(entity.id)}>{entity.name}</button>)}</div></fieldset>
      <label className="field-label">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional context" /></label>
      <label className="field-label">Tags<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="reimbursable, recurring" /></label>
      <label className="check-row"><input type="checkbox" checked={isTransfer} onChange={(event) => setIsTransfer(event.target.checked)} /><span>Mark as internal transfer</span></label>
      <label className="check-row"><input type="checkbox" checked={createRule} onChange={(event) => setCreateRule(event.target.checked)} disabled={!categoryId} /><span>Always categorize {transaction.merchant} this way</span></label>
      <label className="check-row"><input type="checkbox" checked={splitMode} onChange={(event) => setSplitMode(event.target.checked)} /><span>Split this transaction</span></label>
      {splitMode ? <section className="split-editor"><div className="section-heading"><h2>Allocations</h2><span className="money" data-zero={remainder === 0 || undefined}>{remainder === null ? "Check amounts" : `${formatCents(remainder)} remaining`}</span></div>{splits.map((split, index) => <div className="split-row" key={split.id ?? index}><input className="money-input" aria-label={`Split ${index + 1} amount`} value={split.amount} onChange={(event) => updateSplit(index, { amount: event.target.value })} inputMode="decimal" /><select aria-label={`Split ${index + 1} category`} value={split.categoryId} onChange={(event) => updateSplit(index, { categoryId: event.target.value })}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><select aria-label={`Split ${index + 1} entity`} value={split.entityId} onChange={(event) => updateSplit(index, { entityId: event.target.value })}>{entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select>{splits.length > 2 ? <button className="icon-button" type="button" onClick={() => setSplits((current) => current.filter((_, splitIndex) => splitIndex !== index))} aria-label={`Remove split ${index + 1}`}><Trash2 size={18} /></button> : null}</div>)}<button className="secondary-button" type="button" onClick={() => setSplits((current) => [...current, { amount: "0.00", categoryId: "", entityId, note: "" }])}><Plus size={18} /> Add split</button></section> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button save-transaction" type="submit" disabled={busy || (splitMode && remainder !== 0)}>{busy ? "Saving…" : "Save transaction"}</button>
    </form>
  );
}

"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

type Rule = { id: string; name: string; priority: number; enabled: number; match_field: "merchant" | "description"; match_op: "contains" | "equals"; match_value: string; category_name?: string; entity_name?: string };
type Category = { id: string; name: string; default_bucket: string };
type Entity = { id: string; name: string };

export function RuleEditor({ initialRules, categories, entities }: { initialRules: Rule[]; categories: Category[]; entities: Entity[] }) {
  const [rules, setRules] = useState(initialRules);
  const [name, setName] = useState("");
  const [matchField, setMatchField] = useState<"merchant" | "description">("merchant");
  const [matchOp, setMatchOp] = useState<"contains" | "equals">("contains");
  const [matchValue, setMatchValue] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [entityId, setEntityId] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (!matchValue.trim()) { setMatchCount(0); return; }
      const response = await fetch("/api/rules/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ matchField, matchOp, matchValue }), signal: controller.signal });
      if (response.ok) setMatchCount(((await response.json()) as { count: number }).count);
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [matchField, matchOp, matchValue]);

  async function create(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy("new");
    const category = categories.find((item) => item.id === categoryId);
    const response = await fetch("/api/rules", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: name || `${matchValue} rule`, priority: 100, matchField, matchOp, matchValue, categoryId: categoryId || null, bucket: category?.default_bucket ?? null, entityId: entityId || null }) });
    const body = await response.json() as { id?: string; error?: string };
    if (!response.ok) { setError(body.error ?? "Unable to create rule."); setBusy(""); return; }
    setRules((current) => [...current, { id: body.id!, name: name || `${matchValue} rule`, priority: 100, enabled: 1, match_field: matchField, match_op: matchOp, match_value: matchValue, category_name: category?.name, entity_name: entities.find((item) => item.id === entityId)?.name }]);
    setName(""); setMatchValue(""); setCategoryId(""); setEntityId(""); setBusy("");
  }

  async function toggle(rule: Rule) {
    setBusy(rule.id); setError("");
    const enabled = !rule.enabled;
    const response = await fetch(`/api/rules/${rule.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled }) });
    if (!response.ok) setError("Unable to update rule.");
    else setRules((current) => current.map((item) => item.id === rule.id ? { ...item, enabled: Number(enabled) } : item));
    setBusy("");
  }

  async function remove(rule: Rule) {
    setBusy(rule.id); setError("");
    const response = await fetch(`/api/rules/${rule.id}`, { method: "DELETE" });
    if (!response.ok) setError("Unable to delete rule."); else setRules((current) => current.filter((item) => item.id !== rule.id));
    setBusy("");
  }

  return <div className="settings-editor">
    <form className="editor-card" onSubmit={create}>
      <div className="section-heading"><h2>New rule</h2><Plus size={18} /></div>
      <label className="field-label">Rule name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Coffee shops" /></label>
      <div className="editor-grid"><label className="field-label">Match<select value={matchField} onChange={(event) => setMatchField(event.target.value as typeof matchField)}><option value="merchant">Merchant</option><option value="description">Description</option></select></label><label className="field-label">Condition<select value={matchOp} onChange={(event) => setMatchOp(event.target.value as typeof matchOp)}><option value="contains">Contains</option><option value="equals">Equals</option></select></label></div>
      <label className="field-label">Text<input required value={matchValue} onChange={(event) => setMatchValue(event.target.value)} placeholder="ADOBE" /></label>
      <p className="rule-preview" aria-live="polite">This rule would match <strong>{matchCount}</strong> past {matchCount === 1 ? "transaction" : "transactions"}.</p>
      <div className="editor-grid"><label className="field-label">Set category<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">No change</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="field-label">Set entity<select value={entityId} onChange={(event) => setEntityId(event.target.value)}><option value="">No change</option>{entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></label></div>
      <button className="primary-button" disabled={busy === "new"}>{busy === "new" ? "Saving…" : "Create rule"}</button>
    </form>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <section className="editor-list"><p className="eyebrow">Rules run by priority</p>{rules.length ? rules.map((rule) => <div className="rule-row" key={rule.id} data-disabled={!rule.enabled || undefined}><label className="check-row"><input type="checkbox" checked={Boolean(rule.enabled)} disabled={busy === rule.id} onChange={() => toggle(rule)} /><span><strong>{rule.name}</strong><small>{rule.match_field} {rule.match_op} “{rule.match_value}” → {[rule.category_name, rule.entity_name].filter(Boolean).join(" · ")}</small></span></label><button className="icon-button" type="button" disabled={busy === rule.id} onClick={() => remove(rule)} aria-label={`Delete ${rule.name}`}><Trash2 size={17} /></button></div>) : <div className="empty-state"><h2>No rules yet</h2><p>Create one for a merchant you see often.</p></div>}</section>
  </div>;
}

"use client";

import { Archive, Plus, RotateCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Category = { id: string; name: string; default_bucket: string; color_token: string; is_archived: number };
const buckets = ["need", "want", "save", "income", "transfer", "ignore"] as const;
const colors = Array.from({ length: 8 }, (_, index) => `category-${index + 1}`);

export function CategoryEditor({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState("");
  const [bucket, setBucket] = useState<(typeof buckets)[number]>("want");
  const [colorToken, setColorToken] = useState("category-3");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  async function create(event: FormEvent) {
    event.preventDefault(); setError(""); setBusyId("new");
    const response = await fetch("/api/categories", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, bucket, colorToken }) });
    const body = await response.json() as { error?: string; id?: string };
    if (!response.ok) { setError(body.error ?? "Unable to add category."); setBusyId(""); return; }
    setCategories((current) => [...current, { id: body.id!, name, default_bucket: bucket, color_token: colorToken, is_archived: 0 }]);
    setName(""); setBusyId(""); router.refresh();
  }

  async function update(category: Category, changes: Partial<Category>) {
    setError(""); setBusyId(category.id);
    const response = await fetch(`/api/categories/${category.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: changes.name, colorToken: changes.color_token, isArchived: changes.is_archived === undefined ? undefined : Boolean(changes.is_archived) }) });
    const body = await response.json() as { error?: string };
    if (!response.ok) { setError(body.error ?? "Unable to update category."); setBusyId(""); return; }
    setCategories((current) => current.map((item) => item.id === category.id ? { ...item, ...changes } : item));
    setBusyId(""); router.refresh();
  }

  return <div className="settings-editor">
    <form className="editor-card" onSubmit={create}>
      <div className="section-heading"><h2>Add category</h2><Plus size={18} /></div>
      <label className="field-label">Name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Hobbies" /></label>
      <div className="editor-grid"><label className="field-label">Bucket<select value={bucket} onChange={(event) => setBucket(event.target.value as typeof bucket)}>{buckets.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="field-label">Color<select value={colorToken} onChange={(event) => setColorToken(event.target.value)}>{colors.map((color) => <option key={color} value={color}>{color.replace("category-", "Color ")}</option>)}</select></label></div>
      <button className="primary-button" disabled={busyId === "new"}>{busyId === "new" ? "Adding…" : "Add category"}</button>
    </form>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <section className="editor-list"><p className="eyebrow">Categories</p>{categories.map((category) => <CategoryRow key={category.id} category={category} busy={busyId === category.id} onSave={update} />)}</section>
  </div>;
}

function CategoryRow({ category, busy, onSave }: { category: Category; busy: boolean; onSave: (category: Category, changes: Partial<Category>) => void }) {
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color_token);
  return <div className="editor-row" data-archived={Boolean(category.is_archived) || undefined}>
    <span className="category-swatch" data-color={color} />
    <div><input aria-label={`${category.name} name`} value={name} onChange={(event) => setName(event.target.value)} /><small>{category.default_bucket}{category.is_archived ? " · archived" : ""}</small></div>
    <select aria-label={`${category.name} color`} value={color} onChange={(event) => setColor(event.target.value)}>{colors.map((item) => <option key={item} value={item}>{item.replace("category-", "Color ")}</option>)}</select>
    <button className="icon-button" type="button" disabled={busy || (!name.trim())} onClick={() => onSave(category, { name: name.trim(), color_token: color })} aria-label={`Save ${category.name}`}><Save size={17} /></button>
    <button className="icon-button" type="button" disabled={busy} onClick={() => onSave(category, { is_archived: category.is_archived ? 0 : 1 })} aria-label={`${category.is_archived ? "Restore" : "Archive"} ${category.name}`}>{category.is_archived ? <RotateCcw size={17} /> : <Archive size={17} />}</button>
  </div>;
}

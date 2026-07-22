"use client";

import { FileUp, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { CsvImporter, parseCsvRows, suggestMapping } from "@/lib/importers/csv";
import { OfxImporter } from "@/lib/importers/ofx";
import type { CsvColumnMapping, NormalizedImportTransaction } from "@/lib/importers/types";
import { formatCents } from "@/lib/money";

type Account = { id: string; name: string; type: string };

export function ImportTransactions({ accounts }: { accounts: Account[] }) {
  const [fileName, setFileName] = useState("");
  const [fileText, setFileText] = useState("");
  const [kind, setKind] = useState<"csv" | "ofx">("csv");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<CsvColumnMapping>({ date: "", description: "", positiveMeansOutflow: false });
  const [ofxRows, setOfxRows] = useState<NormalizedImportTransaction[]>([]);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  const csvRows = useMemo(() => {
    if (!fileText || kind !== "csv" || !mapping.date || !mapping.description) return [];
    try {
      return [] as NormalizedImportTransaction[];
    } catch {
      return [] as NormalizedImportTransaction[];
    }
  }, [fileText, kind, mapping.date, mapping.description]);

  const [previewRows, setPreviewRows] = useState<NormalizedImportTransaction[]>(csvRows);

  async function chooseFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setResult("");
    const text = await file.text();
    const isOfx = /\.(ofx|qfx)$/i.test(file.name) || /<OFX>/i.test(text);
    setFileName(file.name);
    setFileText(text);
    setKind(isOfx ? "ofx" : "csv");
    try {
      if (isOfx) {
        const rows = await new OfxImporter().fetch(text);
        setOfxRows(rows);
        setPreviewRows(rows.slice(0, 10));
        setHeaders([]);
      } else {
        const parsed = parseCsvRows(text);
        const suggested = suggestMapping(parsed.headers);
        setHeaders(parsed.headers);
        setMapping(suggested);
        const rows = await new CsvImporter().fetch({ text, mapping: suggested });
        setPreviewRows(rows.slice(0, 10));
        setOfxRows([]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to read this file.");
    }
  }

  async function updateMapping(next: CsvColumnMapping) {
    setMapping(next);
    try {
      const rows = await new CsvImporter().fetch({ text: fileText, mapping: next });
      setPreviewRows(rows.slice(0, 10));
      setError("");
    } catch (caught) {
      setPreviewRows([]);
      setError(caught instanceof Error ? caught.message : "Check the column mapping.");
    }
  }

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const transactions = kind === "ofx" ? ofxRows : await new CsvImporter().fetch({ text: fileText, mapping });
      const response = await fetch("/api/imports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId, transactions }),
      });
      const body = await response.json() as { imported?: number; skipped?: number; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Import failed.");
      setResult(`${body.imported ?? 0} imported · ${body.skipped ?? 0} duplicates skipped`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFileName(""); setFileText(""); setHeaders([]); setPreviewRows([]); setOfxRows([]); setResult(""); setError("");
  }

  return (
    <div className="import-flow">
      {!fileText ? (
        <label className="file-drop">
          <FileUp size={24} aria-hidden="true" />
          <strong>Choose a bank export</strong>
          <span>CSV, OFX, or QFX · processed privately in Ledger</span>
          <input type="file" accept=".csv,.ofx,.qfx,text/csv,application/x-ofx" onChange={(event) => chooseFile(event.target.files?.[0])} />
        </label>
      ) : (
        <>
          <div className="file-summary"><span><strong>{fileName}</strong><small>{kind.toUpperCase()} · {kind === "ofx" ? ofxRows.length : parseCsvRows(fileText).rows.length} rows</small></span><button className="icon-button bordered" type="button" onClick={reset} aria-label="Choose another file"><RotateCcw size={18} /></button></div>
          <label className="field-label">Account<select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          {kind === "csv" ? (
            <section className="mapping-grid">
              <p className="eyebrow">Column mapping</p>
              <MappingSelect label="Date" value={mapping.date} headers={headers} onChange={(date) => updateMapping({ ...mapping, date })} />
              <MappingSelect label="Description" value={mapping.description} headers={headers} onChange={(description) => updateMapping({ ...mapping, description })} />
              <MappingSelect label="Amount" value={mapping.amount ?? ""} headers={headers} optional onChange={(amount) => updateMapping({ ...mapping, amount: amount || undefined, debit: amount ? undefined : mapping.debit, credit: amount ? undefined : mapping.credit })} />
              <div className="mapping-pair"><MappingSelect label="Debit" value={mapping.debit ?? ""} headers={headers} optional onChange={(debit) => updateMapping({ ...mapping, debit: debit || undefined, amount: debit ? undefined : mapping.amount })} /><MappingSelect label="Credit" value={mapping.credit ?? ""} headers={headers} optional onChange={(credit) => updateMapping({ ...mapping, credit: credit || undefined, amount: credit ? undefined : mapping.amount })} /></div>
              {mapping.amount ? <label className="check-row"><input type="checkbox" checked={mapping.positiveMeansOutflow} onChange={(event) => updateMapping({ ...mapping, positiveMeansOutflow: event.target.checked })} /><span>Positive amounts are money out</span></label> : null}
            </section>
          ) : null}
          <section className="import-preview">
            <p className="eyebrow">Preview · first {previewRows.length}</p>
            {previewRows.map((row, index) => <div className="preview-row" key={`${row.postedAt}-${index}`}><span><strong>{row.merchantClean}</strong><small>{row.postedAt}</small></span><span className="money">{formatCents(row.amountCents, { showPositiveSign: row.amountCents > 0 })}</span></div>)}
          </section>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {result ? <p className="success-message" role="status">{result}</p> : null}
          <button className="primary-button import-button" type="button" onClick={confirm} disabled={busy || !previewRows.length || !accountId}>{busy ? "Importing…" : "Import transactions"}</button>
        </>
      )}
    </div>
  );
}

function MappingSelect({ label, value, headers, optional = false, onChange }: { label: string; value: string; headers: string[]; optional?: boolean; onChange: (value: string) => void }) {
  return <label className="field-label">{label}<select value={value} onChange={(event) => onChange(event.target.value)}>{optional ? <option value="">Not used</option> : null}{headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>;
}

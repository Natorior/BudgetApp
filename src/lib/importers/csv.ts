import Papa from "papaparse";
import { normalizeMerchant } from "@/lib/merchant";
import { toCents } from "@/lib/money";
import type { CsvColumnMapping, NormalizedImportTransaction, TransactionImporter } from "./types";

type CsvInput = { text: string; mapping: CsvColumnMapping };
type CsvRow = Record<string, string>;

function isoDate(value: string) {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const us = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (us) {
    const year = us[3].length === 2 ? `20${us[3]}` : us[3];
    return `${year}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }
  throw new TypeError(`Unsupported date: ${value}`);
}

function cleanMoney(value: string) {
  const cleaned = value.trim().replace(/^\((.*)\)$/, "-$1");
  return cleaned ? toCents(cleaned) : 0;
}

export function parseCsvRows(text: string) {
  const result = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: "greedy", transformHeader: (header) => header.trim() });
  if (result.errors.length && !result.data.length) throw new TypeError(result.errors[0]?.message ?? "Unable to parse CSV.");
  return { rows: result.data, headers: result.meta.fields ?? [] };
}

export function suggestMapping(headers: string[]): CsvColumnMapping {
  const find = (...terms: string[]) => headers.find((header) => terms.some((term) => header.toLowerCase().includes(term)));
  const debit = find("debit", "withdrawal");
  const credit = find("credit", "deposit");
  return {
    date: find("posted date", "transaction date", "date") ?? headers[0] ?? "",
    description: find("description", "merchant", "name", "memo") ?? headers[1] ?? "",
    amount: debit || credit ? undefined : find("amount") ?? headers[2],
    debit,
    credit,
    externalId: find("transaction id", "fitid", "reference"),
    positiveMeansOutflow: false,
  };
}

export class CsvImporter implements TransactionImporter<CsvInput> {
  async fetch({ text, mapping }: CsvInput): Promise<NormalizedImportTransaction[]> {
    const { rows } = parseCsvRows(text);
    return rows.map((row) => {
      const descriptionRaw = row[mapping.description]?.trim();
      if (!descriptionRaw) throw new TypeError("Every imported row needs a description.");
      let amountCents: number;
      if (mapping.debit || mapping.credit) {
        amountCents = -Math.abs(cleanMoney(mapping.debit ? row[mapping.debit] ?? "" : "")) + Math.abs(cleanMoney(mapping.credit ? row[mapping.credit] ?? "" : ""));
      } else if (mapping.amount) {
        amountCents = cleanMoney(row[mapping.amount] ?? "");
        if (mapping.positiveMeansOutflow) amountCents *= -1;
      } else {
        throw new TypeError("Map either an amount column or debit and credit columns.");
      }
      return {
        externalId: mapping.externalId ? row[mapping.externalId]?.trim() || undefined : undefined,
        postedAt: isoDate(row[mapping.date] ?? ""),
        amountCents,
        descriptionRaw,
        merchantClean: normalizeMerchant(descriptionRaw),
      };
    });
  }
}

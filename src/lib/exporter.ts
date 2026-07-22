export const exportColumns = ["date", "posted_date", "account", "account_type", "merchant", "description", "amount", "currency", "category", "parent_category", "bucket", "entity", "income_source", "counterparty", "tax_category", "schedule_c_line", "deductible_pct", "deductible_amount", "is_transfer", "is_pending", "is_split", "split_of", "notes", "tags", "category_source", "transaction_id"] as const;

export type ExportRow = Record<(typeof exportColumns)[number], string | number | boolean | null>;
export type ExportTotals = { count: number; inflowsCents: number; outflowsCents: number; netCents: number };

export function decimalCents(cents: number) {
  if (!Number.isSafeInteger(cents)) throw new TypeError("Export money must be integer cents.");
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function serializeCsvRow(row: ExportRow) { return exportColumns.map((column) => escapeCsv(row[column])).join(",") + "\r\n"; }
export function serializeCsvHeader() { return exportColumns.join(",") + "\r\n"; }
export function serializeReconciliationFooter(totals: ExportTotals) {
  const row = Object.fromEntries(exportColumns.map((column) => [column, ""])) as ExportRow;
  row.date = "TOTAL"; row.description = `count=${totals.count}; inflows=${decimalCents(totals.inflowsCents)}; outflows=${decimalCents(totals.outflowsCents)}; net=${decimalCents(totals.netCents)}`; row.amount = decimalCents(totals.netCents);
  return serializeCsvRow(row);
}

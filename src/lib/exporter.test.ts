import { describe, expect, it } from "vitest";
import { decimalCents, exportColumns, serializeCsvRow, serializeReconciliationFooter, type ExportRow } from "./exporter";

describe("export serialization", () => {
  it("writes signed decimal amounts once", () => { expect(decimalCents(-1268)).toBe("-12.68"); expect(decimalCents(238000)).toBe("2380.00"); });
  it("keeps the fixed column order and escapes fields", () => {
    const row = Object.fromEntries(exportColumns.map((column) => [column, ""])) as ExportRow;
    row.date = "2026-07-14"; row.description = "Lunch, team"; row.amount = "-12.68";
    expect(serializeCsvRow(row)).toContain('2026-07-14,,,,,"Lunch, team",-12.68');
  });
  it("reconciles the footer", () => { expect(serializeReconciliationFooter({ count: 2, inflowsCents: 1000, outflowsCents: -250, netCents: 750 })).toContain("count=2; inflows=10.00; outflows=-2.50; net=7.50"); });
});

import { describe, expect, it } from "vitest";
import { CsvImporter, parseCsvRows, suggestMapping } from "./csv";

describe("CSV importer", () => {
  it("detects common columns and normalizes signs", async () => {
    const text = "Date,Description,Debit,Credit\n07/14/2026,CHIPOTLE 2034,12.68,\n07/18/2026,AMAZON RETURN,,32.00";
    const parsed = parseCsvRows(text);
    const mapping = suggestMapping(parsed.headers);
    const transactions = await new CsvImporter().fetch({ text, mapping });
    expect(transactions.map((transaction) => transaction.amountCents)).toEqual([-1268, 3200]);
    expect(transactions[0]?.merchantClean).toBe("CHIPOTLE");
  });
});

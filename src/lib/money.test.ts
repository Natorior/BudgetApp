import { describe, expect, it } from "vitest";
import { formatCents, sumCents, toCents } from "./money";

describe("money helpers", () => {
  it("parses dollar input without floating point arithmetic", () => {
    expect(toCents("$1,963.44")).toBe(196344);
    expect(toCents("-12.6")).toBe(-1260);
    expect(toCents("0.01")).toBe(1);
  });

  it("rejects fractional cents and non-monetary input", () => {
    expect(() => toCents("1.234")).toThrow();
    expect(() => toCents("NaN")).toThrow();
  });

  it("formats signed cents consistently", () => {
    expect(formatCents(196344)).toBe("$1,963.44");
    expect(formatCents(70600, { showPositiveSign: true, hideZeroCents: true })).toBe("+$706");
    expect(formatCents(-1268)).toBe("-$12.68");
  });

  it("sums only safe integer cents", () => {
    expect(sumCents([196344, -125712])).toBe(70632);
    expect(() => sumCents([0.5])).toThrow();
  });
});

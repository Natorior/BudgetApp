import { describe, expect, it } from "vitest";
import { normalizeMerchant } from "./merchant";

describe("merchant normalization", () => {
  it.each([
    ["TST* TST COFFEE 8829", "TST COFFEE"],
    ["TST*TST COFFEE", "TST COFFEE"],
    ["SQ *BLUESTREET COFFEE", "BLUESTREET COFFEE"],
    ["AMAZON.COM*RT4Y83", "AMAZON.COM"],
    ["MCDONALD'S F1234", "MCDONALD'S"],
    ["POS DEBIT WAWA 8832 BLACKSBURG VA", "WAWA BLACKSBURG VA"],
  ])("normalizes %s", (raw, expected) => {
    expect(normalizeMerchant(raw)).toBe(expected);
  });
});

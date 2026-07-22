const leadingNoise = /^(?:SQ\s*\*|TST\s*\*|PAYPAL\s*\*|POS\s+DEBIT\s+)+/i;
const dateNoise = /\b(?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g;
const storeNumber = /(?:#\s*|\bF?)\d{3,}\b/g;
const merchantToken = /\*[A-Z0-9]{5,}\b/g;

export function normalizeMerchant(value: string) {
  return value
    .normalize("NFKC")
    .toUpperCase()
    .trim()
    .replace(leadingNoise, "")
    .replace(merchantToken, "")
    .replace(dateNoise, "")
    .replace(storeNumber, "")
    .replace(/\s+/g, " ")
    .replace(/[\s*#-]+$/g, "")
    .trim();
}

export type FormatCentsOptions = {
  showPositiveSign?: boolean;
  hideZeroCents?: boolean;
};

function assertCents(value: number) {
  if (!Number.isSafeInteger(value)) throw new TypeError("Money must be represented as integer cents.");
}

export function toCents(value: string) {
  const match = value.trim().replaceAll(",", "").match(/^([+-])?\$?(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) throw new TypeError("Enter a monetary amount with no more than two decimal places.");
  const sign = match[1] === "-" ? -1 : 1;
  const whole = Number(match[2]);
  const fraction = Number((match[3] ?? "").padEnd(2, "0"));
  const cents = sign * (whole * 100 + fraction);
  assertCents(cents);
  return cents;
}

export function formatCents(cents: number, options: FormatCentsOptions = {}) {
  assertCents(cents);
  const absolute = Math.abs(cents);
  const dollars = Math.trunc(absolute / 100);
  const remainder = absolute % 100;
  const sign = cents < 0 ? "-" : cents > 0 && options.showPositiveSign ? "+" : "";
  const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(dollars);
  const fraction = options.hideZeroCents && remainder === 0 ? "" : `.${remainder.toString().padStart(2, "0")}`;
  return `${sign}$${whole}${fraction}`;
}

export function sumCents(values: readonly number[]) {
  const total = values.reduce((sum, value) => {
    assertCents(value);
    return sum + value;
  }, 0);
  assertCents(total);
  return total;
}

import { formatCents } from "@/lib/money";

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value * 100) / total)));
}

export function MonthRail({ monthLabel, day, daysInMonth, incomeCents, spendCents, budgetCents }: {
  monthLabel: string;
  day: number;
  daysInMonth: number;
  incomeCents: number;
  spendCents: number;
  budgetCents: number | null;
}) {
  const scale = Math.max(incomeCents, spendCents, budgetCents ?? 0, 1);
  const elapsed = percent(day, daysInMonth);
  const outPercent = percent(spendCents, scale);
  const budgetPercent = budgetCents ? percent(budgetCents, scale) : 100;
  const pace = budgetCents ? percent(spendCents, budgetCents) : null;
  const state = pace === null ? "No budget set" : pace > 100 ? "Over budget" : pace > elapsed + 5 ? "Ahead of pace" : "On pace";

  return (
    <section className="month-rail" aria-label={`${monthLabel} cash flow`}>
      <div className="rail-header">
        <span className="eyebrow">{monthLabel}</span>
        <span>{day} of {daysInMonth} days</span>
      </div>
      <div className="rail-chart">
        <div className="today-tick" style={{ left: `${elapsed}%` }} aria-hidden="true" />
        <div className="rail-row">
          <span>in</span>
          <div>
            <div className="rail-track"><span className="rail-fill income" style={{ width: `${percent(incomeCents, scale)}%` }} /></div>
            <p className="money rail-value">{formatCents(incomeCents, { hideZeroCents: true })}</p>
          </div>
        </div>
        <div className="rail-row">
          <span>out</span>
          <div>
            <div className="rail-track">
              <span className="rail-budget" style={{ width: `${budgetPercent}%` }} />
              <span className="rail-fill spending" data-over={pace !== null && pace > 100 || undefined} style={{ width: `${outPercent}%` }} />
            </div>
            <p className="money rail-value">{formatCents(spendCents, { hideZeroCents: true })}{budgetCents ? ` of ${formatCents(budgetCents, { hideZeroCents: true })}` : ""}</p>
          </div>
        </div>
      </div>
      <p className="rail-state">{state} <span aria-hidden="true">·</span> today {elapsed}%</p>
    </section>
  );
}

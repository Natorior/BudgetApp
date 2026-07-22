import { formatCents } from "@/lib/money";

function ratio(value: number, total: number) {
  if (total <= 0) return null;
  return Math.round((value * 100) / total);
}

export function PaceBar({ name, spentCents, budgetCents, elapsedPercent, colorToken }: {
  name: string;
  spentCents: number;
  budgetCents: number;
  elapsedPercent: number;
  colorToken: string;
}) {
  const used = ratio(spentCents, budgetCents);
  const state = used === null ? "No budget" : used > 100 ? `over by ${formatCents(spentCents - budgetCents, { hideZeroCents: true })}` : used > elapsedPercent + 5 ? "ahead of pace" : "on pace";
  return (
    <div className="pace-line" data-color={colorToken}>
      <div className="pace-heading"><span>{name}</span><span className="money">{formatCents(spentCents, { hideZeroCents: true })} of {formatCents(budgetCents, { hideZeroCents: true })}</span></div>
      <div className="pace-track">
        <span className="pace-fill" data-over={used !== null && used > 100 || undefined} style={{ width: `${Math.min(100, used ?? 0)}%` }} />
        <span className="pace-tick" style={{ left: `${elapsedPercent}%` }} />
      </div>
      <div className="pace-caption"><span>{used === null ? "—" : `${used}% used`}</span><span>{state}</span></div>
    </div>
  );
}

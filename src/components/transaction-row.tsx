"use client";

import { ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { formatCents } from "@/lib/money";
import type { TransactionListItem } from "@/lib/queries";

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function TransactionRow({ transaction, selectable = false, selected = false, onSelect, href }: { transaction: TransactionListItem; selectable?: boolean; selected?: boolean; onSelect?: (selected: boolean) => void; href?: string }) {
  const positive = transaction.amountCents > 0 && transaction.bucket === "income";
  const content = (
    <>
      <div className="transaction-topline">
        <span className="transaction-merchant">{transaction.merchant}</span>
        <span className="money transaction-amount" data-positive={positive || undefined}>{formatCents(transaction.amountCents, { showPositiveSign: positive })}</span>
      </div>
      <div className="transaction-meta">
        <span>{transaction.category ?? "Uncategorized"}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={transaction.postedAt}>{dateFormatter.format(new Date(`${transaction.postedAt}T00:00:00Z`))}</time>
        {transaction.isPending ? <><span aria-hidden="true">·</span><span>pending</span></> : null}
        {transaction.isTransfer ? <ArrowLeftRight aria-label="Paired transfer" size={14} /> : null}
        {transaction.entityId === "entity_business" ? <span className="entity-chip">Business</span> : null}
      </div>
    </>
  );
  return (
    <div className="transaction-row" data-pending={transaction.isPending || undefined} data-transfer={transaction.isTransfer || undefined} data-selected={selected || undefined}>
      {selectable ? (
        <label className="row-select">
          <input type="checkbox" aria-label={`Select ${transaction.merchant}`} name="selected" value={transaction.id} checked={selected} onChange={(event) => onSelect?.(event.target.checked)} />
          <span aria-hidden="true" />
        </label>
      ) : null}
      {href ? <Link href={href} className="transaction-main">{content}</Link> : <div className="transaction-main">{content}</div>}
    </div>
  );
}

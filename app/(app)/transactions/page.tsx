import type { Metadata } from "next";
import { Search, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ScopeSwitcher } from "@/components/scope-switcher";
import { TransactionRow } from "@/components/transaction-row";
import { getTransactions } from "@/lib/queries";
import { parseScope } from "@/lib/scope";

export const metadata: Metadata = { title: "Transactions" };

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ scope?: string; q?: string; review?: string }> }) {
  const params = await searchParams;
  const scope = parseScope(params.scope);
  const transactions = await getTransactions(scope, params.q ?? "");
  const visible = params.review === "1" ? transactions.filter((transaction) => !transaction.category || transaction.isPending) : transactions;

  return (
    <>
      <PageHeader title="Transactions"><ScopeSwitcher value={scope} /></PageHeader>
      <form className="search-row" action="/transactions">
        {scope !== "all" ? <input type="hidden" name="scope" value={scope} /> : null}
        <label className="search-input"><Search size={18} aria-hidden="true" /><input name="q" defaultValue={params.q} placeholder="Search merchants" aria-label="Search transactions" /></label>
        <button className="icon-button bordered" type="button" aria-label="Open filters"><SlidersHorizontal size={19} /></button>
      </form>
      {params.review === "1" ? <div className="filter-notice"><span>Needs review</span><a href={`/transactions${scope === "all" ? "" : `?scope=${scope}`}`}>Clear</a></div> : null}
      <div className="transaction-list transaction-screen-list">
        {visible.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} selectable />)}
      </div>
      {visible.length === 0 ? <div className="empty-state"><h2>No matching transactions</h2><p>Change the search or clear the current filter.</p></div> : null}
    </>
  );
}

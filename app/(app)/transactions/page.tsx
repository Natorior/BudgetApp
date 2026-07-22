import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ScopeSwitcher } from "@/components/scope-switcher";
import { TransactionLedger } from "@/components/transaction-ledger";
import { getEditorOptions, getTransactions } from "@/lib/queries";
import { parseScope } from "@/lib/scope";

export const metadata: Metadata = { title: "Transactions" };

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ scope?: string; q?: string; review?: string }> }) {
  const params = await searchParams;
  const scope = parseScope(params.scope);
  const [transactions, options] = await Promise.all([getTransactions(scope, params.q ?? ""), getEditorOptions()]);

  return (
    <>
      <PageHeader title="Transactions"><ScopeSwitcher value={scope} /></PageHeader>
      <TransactionLedger initialTransactions={transactions} categories={options.categories} entities={options.entities} accounts={options.accounts} reviewOnly={params.review === "1"} />
    </>
  );
}

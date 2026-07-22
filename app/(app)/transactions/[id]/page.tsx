import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TransactionEditor } from "@/components/transaction-editor";
import { getEditorOptions, getTransactionDetail } from "@/lib/queries";

export const metadata: Metadata = { title: "Transaction" };

export default async function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [transaction, options] = await Promise.all([getTransactionDetail(id), getEditorOptions()]);
  if (!transaction) notFound();
  return (
    <>
      <PageHeader eyebrow="Transaction detail" action={<Link className="icon-button" href="/transactions" aria-label="Back to transactions"><ChevronLeft /></Link>} />
      <TransactionEditor transaction={transaction} categories={options.categories} entities={options.entities} />
    </>
  );
}

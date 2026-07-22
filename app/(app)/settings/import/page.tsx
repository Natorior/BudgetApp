import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ImportTransactions } from "@/components/import-transactions";
import { PageHeader } from "@/components/page-header";
import { getImportAccounts } from "@/lib/queries";

export const metadata: Metadata = { title: "Import transactions" };

export default async function ImportPage() {
  const accounts = await getImportAccounts();
  return (
    <>
      <PageHeader title="Import transactions" action={<Link className="icon-button" href="/settings" aria-label="Back to settings"><ChevronLeft /></Link>} />
      <p className="page-intro">Map the bank’s columns, verify the signs, then confirm. Nothing is written until the preview looks right.</p>
      <ImportTransactions accounts={accounts} />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ReviewQueue } from "@/components/review-queue";
import { getEditorOptions, getReviewQueue } from "@/lib/queries";

export const metadata: Metadata = { title: "Review transactions" };

export default async function ReviewPage() {
  const [transactions, options] = await Promise.all([getReviewQueue(), getEditorOptions()]);
  return <><PageHeader eyebrow="Review queue" action={<Link className="icon-button" href="/transactions" aria-label="Close review"><X /></Link>} /><ReviewQueue initialTransactions={transactions} categories={options.categories} entities={options.entities} /></>;
}

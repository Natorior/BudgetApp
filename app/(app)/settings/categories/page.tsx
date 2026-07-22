import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CategoryEditor } from "@/components/category-editor";
import { PageHeader } from "@/components/page-header";
import { getCategorySettingsData } from "@/lib/queries";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  return <><PageHeader title="Categories" action={<Link className="icon-button" href="/settings" aria-label="Back to settings"><ChevronLeft /></Link>} /><p className="page-intro">Rename, recolor, or archive the labels used across your ledger.</p><CategoryEditor initialCategories={await getCategorySettingsData()} /></>;
}

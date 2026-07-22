import type { Metadata } from "next";
import { ExportBuilder } from "@/components/export-builder";
import { PageHeader } from "@/components/page-header";
import { getEditorOptions } from "@/lib/queries";

export const metadata: Metadata = { title: "Export" };

export default async function ExportPage() {
  const data = await getEditorOptions();
  return <><PageHeader title="Export" /><p className="page-intro">Preview every slice before downloading. Export totals include a reconciliation footer.</p><ExportBuilder categories={data.categories} accounts={data.accounts} /></>;
}

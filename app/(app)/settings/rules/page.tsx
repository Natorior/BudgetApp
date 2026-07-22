import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RuleEditor } from "@/components/rule-editor";
import { getRuleSettingsData } from "@/lib/queries";

export const metadata: Metadata = { title: "Rules" };

export default async function RulesPage() {
  const data = await getRuleSettingsData();
  return <><PageHeader title="Rules" action={<Link className="icon-button" href="/settings" aria-label="Back to settings"><ChevronLeft /></Link>} /><p className="page-intro">First match wins. Preview past matches before saving.</p><RuleEditor initialRules={data.rules as never[]} categories={data.categories} entities={data.entities} /></>;
}

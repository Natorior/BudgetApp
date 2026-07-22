import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, DatabaseZap, Download, Landmark, LogOut, Shapes, Tags } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getSettingsData } from "@/lib/queries";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const data = await getSettingsData();
  return (
    <>
      <PageHeader title="Settings" />
      <section className="settings-group">
        <p className="eyebrow">Data</p>
        <Link className="settings-row" href="/settings/import"><DatabaseZap /><span><strong>Import transactions</strong><small>CSV and OFX files</small></span><ArrowRight /></Link>
        <Link className="settings-row" href="/export"><Download /><span><strong>Export ledger</strong><small>CSV, JSON, and tax packages</small></span><ArrowRight /></Link>
      </section>
      <section className="settings-group">
        <p className="eyebrow">Organize</p>
        <Link className="settings-row" href="/business"><BriefcaseBusiness /><span><strong>Business</strong><small>Profit, expenses, and reserve</small></span><ArrowRight /></Link>
        <Link className="settings-row" href="/settings/categories"><Shapes /><span><strong>Categories</strong><small>{data.categories.length} active categories</small></span><ArrowRight /></Link>
        <Link className="settings-row" href="/settings/rules"><Tags /><span><strong>Rules</strong><small>Automate repeat merchants</small></span><ArrowRight /></Link>
      </section>
      <section className="settings-group">
        <p className="eyebrow">Connections</p>
        {data.institutions.map((institution) => <div className="settings-row" key={String(institution.name)}><Landmark /><span><strong>{String(institution.name)}</strong><small>Demo connection · {String(institution.status)}</small></span><span className="status-dot" data-status={String(institution.status)} /></div>)}
      </section>
      <form action="/api/auth/logout" method="post"><button className="secondary-button logout-button" type="submit"><LogOut size={18} /> Lock Ledger</button></form>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesCombined, House, List, Settings, WalletCards } from "lucide-react";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Home", icon: House },
  { href: "/transactions", label: "Transactions", icon: List },
  { href: "/budget", label: "Budget", icon: WalletCards },
  { href: "/insights", label: "Insights", icon: ChartNoAxesCombined },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <main className="screen">{children}</main>
      <nav className="tab-bar" aria-label="Primary navigation">
        {navigation.map(({ href, label, icon: Icon }) => {
          const selected = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className="tab-link" data-selected={selected || undefined} aria-current={selected ? "page" : undefined}>
              <Icon aria-hidden="true" size={20} strokeWidth={selected ? 2.25 : 1.75} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

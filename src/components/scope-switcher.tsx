"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Scope } from "@/lib/queries";

const scopes: { value: Scope; label: string }[] = [
  { value: "all", label: "All" },
  { value: "personal", label: "Personal" },
  { value: "business", label: "Business" },
];

export function ScopeSwitcher({ value }: { value: Scope }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  function select(scope: Scope) {
    const params = new URLSearchParams(searchParams.toString());
    if (scope === "all") params.delete("scope");
    else params.set("scope", scope);
    window.localStorage.setItem("ledger-scope", scope);
    router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="scope-switcher" role="group" aria-label="Money scope">
      {scopes.map((scope) => (
        <button key={scope.value} type="button" onClick={() => select(scope.value)} data-selected={value === scope.value || undefined} aria-pressed={value === scope.value}>
          {scope.label}
        </button>
      ))}
    </div>
  );
}

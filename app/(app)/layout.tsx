import { AppShell } from "@/components/app-shell";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionCookie, verifySessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LedgerLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const authenticated = await verifySessionToken(
    cookieStore.get(sessionCookie.name)?.value,
    process.env.SESSION_SECRET ?? "",
  );
  if (!authenticated) redirect("/login");
  return <AppShell>{children}</AppShell>;
}

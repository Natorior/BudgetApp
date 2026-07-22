import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Unlock" };

export default function LoginPage() {
  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="brand-mark" aria-hidden="true"><LockKeyhole size={22} /></div>
        <p className="eyebrow">Private ledger</p>
        <h1>See the month clearly.</h1>
        <p className="login-copy">Your accounts, budgets, and business records stay behind one passcode.</p>
        <LoginForm />
      </section>
    </main>
  );
}

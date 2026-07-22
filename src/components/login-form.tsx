"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passcode: form.get("passcode") }),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Unable to unlock Ledger.");
      setBusy(false);
      return;
    }
    const returnTo = searchParams.get("returnTo");
    router.replace(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/");
    router.refresh();
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label htmlFor="passcode">Passcode</label>
      <input id="passcode" name="passcode" type="password" inputMode="text" autoComplete="current-password" autoFocus required />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button" type="submit" disabled={busy}>{busy ? "Checking…" : "Unlock Ledger"}</button>
    </form>
  );
}

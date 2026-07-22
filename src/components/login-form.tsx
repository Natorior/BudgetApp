"use client";

import { useState, type FormEvent } from "react";

export function LoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode: form.get("passcode") }),
        signal: controller.signal,
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Unable to unlock Ledger.");
        setBusy(false);
        return;
      }
      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      const target = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
      window.location.replace(target);
    } catch (caught) {
      setError(caught instanceof DOMException && caught.name === "AbortError" ? "Login timed out. Check that the local server is running." : "Unable to reach the local server.");
      setBusy(false);
    } finally {
      window.clearTimeout(timeout);
    }
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

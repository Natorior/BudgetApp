import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabase, getDatabase } from "@/db/runtime";
import { verifyPasscode } from "@/lib/auth/passcode";
import { createSessionToken, sessionCookie } from "@/lib/auth/session";

const requestSchema = z.object({ passcode: z.string().min(1).max(128) });
const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 5;

function fingerprint(request: Request, secret: string) {
  const address = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "local";
  return bytesToHex(sha256(utf8ToBytes(`${address}:${secret}`)));
}

export async function POST(request: Request) {
  const appPasscode = process.env.APP_PASSCODE;
  const sessionSecret = process.env.SESSION_SECRET;
  if (!appPasscode || !sessionSecret) {
    return NextResponse.json({ error: "Passcode access is not configured." }, { status: 503 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your passcode." }, { status: 400 });
  }

  await ensureDatabase();
  const db = getDatabase();
  const visitor = fingerprint(request, sessionSecret);
  const cutoff = Math.floor(Date.now() / 1000) - WINDOW_SECONDS;
  await db.prepare("DELETE FROM login_attempts WHERE attempted_at < ?").bind(cutoff).run();
  const recent = await db
    .prepare("SELECT COUNT(*) AS count FROM login_attempts WHERE fingerprint = ? AND attempted_at >= ?")
    .bind(visitor, cutoff)
    .first<{ count: number }>();

  if ((recent?.count ?? 0) >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  if (!(await verifyPasscode(parsed.data.passcode, appPasscode, sessionSecret))) {
    await db
      .prepare("INSERT INTO login_attempts (id, fingerprint, attempted_at) VALUES (?, ?, unixepoch())")
      .bind(crypto.randomUUID(), visitor)
      .run();
    return NextResponse.json({ error: "That passcode is not correct." }, { status: 401 });
  }

  await db.prepare("DELETE FROM login_attempts WHERE fingerprint = ?").bind(visitor).run();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie.name, await createSessionToken(sessionSecret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: sessionCookie.maxAge,
  });
  return response;
}

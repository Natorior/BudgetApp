const encoder = new TextEncoder();
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  issuedAt: number;
  expiresAt: number;
};

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getSigningKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(secret: string, now = Date.now()) {
  const payload: SessionPayload = {
    issuedAt: Math.floor(now / 1000),
    expiresAt: Math.floor(now / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await getSigningKey(secret), encoder.encode(encodedPayload));
  return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string | undefined, secret: string, now = Date.now()) {
  if (!token || !secret) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;

  try {
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      await getSigningKey(secret),
      fromBase64Url(signature),
      encoder.encode(payload),
    );
    if (!validSignature) return false;
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as SessionPayload;
    return Number.isInteger(parsed.expiresAt) && parsed.expiresAt > Math.floor(now / 1000);
  } catch {
    return false;
  }
}

export const sessionCookie = {
  name: "ledger_session",
  maxAge: SESSION_TTL_SECONDS,
};

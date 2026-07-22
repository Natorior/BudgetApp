import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

describe("signed sessions", () => {
  it("accepts a valid token and rejects tampering", async () => {
    const secret = "a-secret-long-enough-for-this-test";
    const token = await createSessionToken(secret, 1_700_000_000_000);
    expect(await verifySessionToken(token, secret, 1_700_000_100_000)).toBe(true);
    expect(await verifySessionToken(`${token}x`, secret, 1_700_000_100_000)).toBe(false);
  });

  it("rejects expired sessions", async () => {
    const secret = "another-long-test-secret";
    const token = await createSessionToken(secret, 1_700_000_000_000);
    expect(await verifySessionToken(token, secret, 1_800_000_000_000)).toBe(false);
  });
});

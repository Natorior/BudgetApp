import { argon2idAsync } from "@noble/hashes/argon2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";

const options = { t: 2, m: 8192, p: 1, dkLen: 32, asyncTick: 8 } as const;
let expectedHash: Promise<Uint8Array> | null = null;

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function saltFromSecret(secret: string) {
  return sha256(utf8ToBytes(`ledger-passcode:${secret}`)).slice(0, 16);
}

export async function verifyPasscode(candidate: string, expected: string, secret: string) {
  const salt = saltFromSecret(secret);
  expectedHash ??= argon2idAsync(expected, salt, options);
  const [candidateHash, storedHash] = await Promise.all([
    argon2idAsync(candidate, salt, options),
    expectedHash,
  ]);
  return constantTimeEqual(candidateHash, storedHash);
}

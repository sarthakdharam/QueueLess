import { createHash, randomBytes } from "node:crypto";

export const LOOKUP_SESSION_TTL_MS = 15 * 60 * 1000;

export function createLookupSecret() {
  return randomBytes(32).toString("base64url");
}

export function lookupSecretHash(secret) {
  return createHash("sha256").update(secret).digest("hex");
}

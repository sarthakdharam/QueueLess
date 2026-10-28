import { createHmac, timingSafeEqual } from "node:crypto";

export function hasValidWebhookSignature(rawBody, suppliedSignature, secret, prefix = "") {
  if (!Buffer.isBuffer(rawBody) || !secret || !suppliedSignature) return false;
  const normalized = suppliedSignature.startsWith(prefix) ? suppliedSignature.slice(prefix.length) : suppliedSignature;
  let supplied;
  try { supplied = Buffer.from(normalized, "hex"); } catch { return false; }
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

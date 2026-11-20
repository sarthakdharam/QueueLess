import { createHash, randomBytes } from "node:crypto";

export const REFRESH_COOKIE_NAME = "queueless_refresh";
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function createRefreshSecret() {
  return randomBytes(48).toString("base64url");
}

export function refreshTokenHash(secret) {
  return createHash("sha256").update(secret).digest("hex");
}

export function isRefreshTokenActive(token, now = new Date()) {
  return Boolean(
    token &&
      !token.revokedAt &&
      new Date(token.expiresAt).getTime() > now.getTime(),
  );
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/v1/auth",
    maxAge: REFRESH_TOKEN_TTL_MS,
  };
}

export function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((entry) => entry.trim().split(/=(.*)/s, 2))
      .filter(([key]) => key)
      .map(([key, value = ""]) => [key, decodeURIComponent(value)]),
  );
}

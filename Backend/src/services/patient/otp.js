import { createHmac } from "node:crypto";

export function otpHash(challengeId, code) {
  return createHmac("sha256", process.env.OTP_SECRET || process.env.JWT_SECRET).update(`${challengeId}:${code}`).digest("hex");
}

import { rateLimit } from "express-rate-limit";

export const registrationLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 12, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many registration attempts. Please try again shortly." } });
export const recoveryLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many recovery attempts. Please wait before trying again." } });
export const lookupReadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 90, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many appointment refreshes. Please wait before trying again." } });

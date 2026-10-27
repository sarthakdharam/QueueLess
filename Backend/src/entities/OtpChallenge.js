import { EntitySchema } from "typeorm";

export const OtpChallenge = new EntitySchema({
  name: "OtpChallenge", tableName: "otp_challenges",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    mobile: { type: "varchar", length: 20 },
    challengeHash: { name: "challenge_hash", type: "char", length: 64 },
    expiresAt: { name: "expires_at", type: "timestamptz" },
    attemptCount: { name: "attempt_count", type: "int", default: 0 },
    verifiedAt: { name: "verified_at", type: "timestamptz", nullable: true },
    consumedAt: { name: "consumed_at", type: "timestamptz", nullable: true },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
  },
  indices: [{ name: "IDX_otp_mobile_created", columns: ["mobile", "createdAt"] }],
});

import { EntitySchema } from "typeorm";

export const PatientAccessToken = new EntitySchema({
  name: "PatientAccessToken", tableName: "patient_access_tokens",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    registrationId: { name: "registration_id", type: "uuid" },
    tokenHash: { name: "token_hash", type: "char", length: 64, unique: true },
    expiresAt: { name: "expires_at", type: "timestamptz" },
    revokedAt: { name: "revoked_at", type: "timestamptz", nullable: true },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
    lastAccessedAt: { name: "last_accessed_at", type: "timestamptz", nullable: true },
  },
  indices: [{ name: "IDX_patient_access_registration", columns: ["registrationId"] }],
});

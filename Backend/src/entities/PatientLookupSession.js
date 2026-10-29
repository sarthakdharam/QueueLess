import { EntitySchema } from "typeorm";

export const PatientLookupSession = new EntitySchema({
  name: "PatientLookupSession", tableName: "patient_lookup_sessions",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    mobile: { type: "varchar", length: 20 },
    tokenHash: { name: "token_hash", type: "char", length: 64, unique: true },
    expiresAt: { name: "expires_at", type: "timestamptz" },
    revokedAt: { name: "revoked_at", type: "timestamptz", nullable: true },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
    lastAccessedAt: { name: "last_accessed_at", type: "timestamptz", nullable: true },
  },
  indices: [{ name: "IDX_patient_lookup_mobile_created", columns: ["mobile", "createdAt"] }],
});

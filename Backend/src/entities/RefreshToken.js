import { EntitySchema } from "typeorm";

export const RefreshToken = new EntitySchema({
  name: "RefreshToken",
  tableName: "refresh_tokens",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    userId: { name: "user_id", type: "uuid" },
    clinicId: { name: "clinic_id", type: "uuid" },
    tokenHash: {
      name: "token_hash",
      type: "varchar",
      length: 64,
      unique: true,
    },
    expiresAt: { name: "expires_at", type: "timestamptz" },
    revokedAt: { name: "revoked_at", type: "timestamptz", nullable: true },
    replacedById: { name: "replaced_by_id", type: "uuid", nullable: true },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
    lastUsedAt: { name: "last_used_at", type: "timestamptz", nullable: true },
  },
  indices: [
    { name: "IDX_refresh_tokens_user", columns: ["userId"] },
    { name: "IDX_refresh_tokens_expiry", columns: ["expiresAt"] },
  ],
  relations: {
    user: {
      type: "many-to-one",
      target: "ClinicUser",
      joinColumn: { name: "user_id" },
      onDelete: "CASCADE",
    },
    clinic: {
      type: "many-to-one",
      target: "Clinic",
      joinColumn: { name: "clinic_id" },
      onDelete: "CASCADE",
    },
  },
});

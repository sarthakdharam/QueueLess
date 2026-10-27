import { EntitySchema } from "typeorm";

export const ClinicUser = new EntitySchema({
  name: "ClinicUser",
  tableName: "clinic_users",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    clinicId: { name: "clinic_id", type: "uuid" },
    name: { type: "varchar", length: 160 },
    email: { type: "varchar", length: 255, unique: true },
    passwordHash: { name: "password_hash", type: "varchar", length: 255, select: false },
    role: { type: "varchar", length: 32, default: "administrator" },
    status: { type: "varchar", length: 24, default: "active" },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamptz", updateDate: true },
  },
  indices: [{ name: "IDX_clinic_users_clinic_id", columns: ["clinicId"] }],
  relations: {
    clinic: { type: "many-to-one", target: "Clinic", joinColumn: { name: "clinic_id" }, onDelete: "CASCADE" },
  },
});

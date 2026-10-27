import { EntitySchema } from "typeorm";

export const Doctor = new EntitySchema({
  name: "Doctor", tableName: "doctors",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    clinicId: { name: "clinic_id", type: "uuid" },
    name: { type: "varchar", length: 160 },
    specialization: { type: "varchar", length: 120, nullable: true },
    details: { type: "text", nullable: true },
    availability: { type: "jsonb", default: () => "'{}'::jsonb" },
    status: { type: "varchar", length: 24, default: "active" },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamptz", updateDate: true },
  },
  indices: [{ name: "IDX_doctors_clinic_id", columns: ["clinicId"] }],
});

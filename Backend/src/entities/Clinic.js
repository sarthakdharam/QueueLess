import { EntitySchema } from "typeorm";

export const Clinic = new EntitySchema({
  name: "Clinic",
  tableName: "clinics",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    name: { type: "varchar", length: 160 },
    address: { type: "text" },
    city: { type: "varchar", length: 100 },
    state: { type: "varchar", length: 100 },
    contactNumber: { name: "contact_number", type: "varchar", length: 20 },
    email: { type: "varchar", length: 255, unique: true },
    timeZone: { name: "time_zone", type: "varchar", length: 64, default: "Asia/Kolkata" },
    status: { type: "varchar", length: 24, default: "active" },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamptz", updateDate: true },
  },
});

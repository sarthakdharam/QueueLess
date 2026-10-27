import { EntitySchema } from "typeorm";

export const Patient = new EntitySchema({
  name: "Patient", tableName: "patients",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    name: { type: "varchar", length: 160 },
    mobile: { type: "varchar", length: 20, unique: true },
    contactConsent: { name: "contact_consent", type: "boolean", default: false },
    consentAt: { name: "consent_at", type: "timestamptz", nullable: true },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamptz", updateDate: true },
  },
});

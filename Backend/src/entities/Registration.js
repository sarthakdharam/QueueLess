import { EntitySchema } from "typeorm";

export const Registration = new EntitySchema({
  name: "Registration", tableName: "registrations",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    reference: { type: "varchar", length: 16, unique: true },
    idempotencyKey: { name: "idempotency_key", type: "varchar", length: 64, nullable: true, unique: true },
    clinicId: { name: "clinic_id", type: "uuid" },
    doctorId: { name: "doctor_id", type: "uuid", nullable: true },
    patientId: { name: "patient_id", type: "uuid" },
    visitType: { name: "visit_type", type: "varchar", length: 24, default: "walk_in" },
    notes: { type: "varchar", length: 500, nullable: true },
    consentToContact: { name: "consent_to_contact", type: "boolean", default: false },
    status: { type: "varchar", length: 24, default: "waiting" },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
    completedAt: { name: "completed_at", type: "timestamptz", nullable: true },
  },
  indices: [{ name: "IDX_registrations_clinic_status", columns: ["clinicId", "status"] }],
});

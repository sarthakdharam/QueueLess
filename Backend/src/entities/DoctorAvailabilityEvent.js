import { EntitySchema } from "typeorm";

export const DoctorAvailabilityEvent = new EntitySchema({
  name: "DoctorAvailabilityEvent", tableName: "doctor_availability_events",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    clinicId: { name: "clinic_id", type: "uuid" },
    doctorId: { name: "doctor_id", type: "uuid" },
    mode: { type: "varchar", length: 32 },
    startsAt: { name: "starts_at", type: "timestamptz" },
    endsAt: { name: "ends_at", type: "timestamptz", nullable: true },
    expectedReturnAt: { name: "expected_return_at", type: "timestamptz", nullable: true },
    note: { type: "varchar", length: 500, nullable: true },
    status: { type: "varchar", length: 24, default: "active" },
    createdBy: { name: "created_by", type: "uuid" },
    resumedAt: { name: "resumed_at", type: "timestamptz", nullable: true },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
  },
  indices: [{ name: "IDX_doctor_availability_active", columns: ["doctorId", "status", "startsAt"] }],
});

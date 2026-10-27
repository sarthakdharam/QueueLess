import { EntitySchema } from "typeorm";

export const Appointment = new EntitySchema({
  name: "Appointment", tableName: "appointments",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    registrationId: { name: "registration_id", type: "uuid", unique: true },
    clinicId: { name: "clinic_id", type: "uuid" },
    doctorId: { name: "doctor_id", type: "uuid" },
    patientId: { name: "patient_id", type: "uuid" },
    scheduledAt: { name: "scheduled_at", type: "timestamptz" },
    slotMinutes: { name: "slot_minutes", type: "int" },
    status: { type: "varchar", length: 24, default: "booked" },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamptz", updateDate: true },
  },
  indices: [
    { name: "IDX_appointments_clinic_time", columns: ["clinicId", "scheduledAt"] },
    { name: "IDX_appointments_doctor_time", columns: ["doctorId", "scheduledAt"] },
  ],
});

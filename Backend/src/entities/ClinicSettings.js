import { EntitySchema } from "typeorm";

export const ClinicSettings = new EntitySchema({
  name: "ClinicSettings", tableName: "clinic_settings",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    clinicId: { name: "clinic_id", type: "uuid", unique: true },
    workingHours: { name: "working_hours", type: "jsonb", default: () => "'{}'::jsonb" },
    breaks: { type: "jsonb", default: () => "'[]'::jsonb" },
    slotDurationMinutes: { name: "slot_duration_minutes", type: "int", default: 15 },
    appointmentCapacity: { name: "appointment_capacity", type: "int", default: 4 },
    walkInsEnabled: { name: "walk_ins_enabled", type: "boolean", default: true },
    notifyAtPatientsAhead: { name: "notify_at_patients_ahead", type: "int", default: 3 },
    missedTurnPolicy: { name: "missed_turn_policy", type: "varchar", length: 32, default: "after_waiting" },
    returnPatientsAhead: { name: "return_patients_ahead", type: "int", default: 5 },
    updatedAt: { name: "updated_at", type: "timestamptz", updateDate: true },
  },
});

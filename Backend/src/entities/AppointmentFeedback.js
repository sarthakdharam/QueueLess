import { EntitySchema } from "typeorm";

export const AppointmentFeedback = new EntitySchema({
  name: "AppointmentFeedback",
  tableName: "appointment_feedback",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    registrationId: { name: "registration_id", type: "uuid", unique: true },
    clinicId: { name: "clinic_id", type: "uuid" },
    rating: { type: "smallint" },
    categories: { type: "jsonb", default: () => "'[]'::jsonb" },
    comment: { type: "varchar", length: 1000, nullable: true },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
  },
  indices: [{ name: "IDX_appointment_feedback_clinic", columns: ["clinicId"] }],
});

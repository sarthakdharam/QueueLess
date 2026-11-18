import { EntitySchema } from "typeorm";

export const AppointmentReschedule = new EntitySchema({
  name: "AppointmentReschedule",
  tableName: "appointment_reschedules",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    appointmentId: { name: "appointment_id", type: "uuid" },
    availabilityEventId: {
      name: "availability_event_id",
      type: "uuid",
      nullable: true,
    },
    previousScheduledAt: { name: "previous_scheduled_at", type: "timestamptz" },
    newScheduledAt: { name: "new_scheduled_at", type: "timestamptz" },
    changedBy: { name: "changed_by", type: "varchar", length: 24 },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
  },
  indices: [
    {
      name: "IDX_appointment_reschedules_appointment",
      columns: ["appointmentId", "createdAt"],
    },
  ],
});

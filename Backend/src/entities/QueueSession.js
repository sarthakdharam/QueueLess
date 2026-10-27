import { EntitySchema } from "typeorm";

export const QueueSession = new EntitySchema({
  name: "QueueSession", tableName: "queue_sessions",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    clinicId: { name: "clinic_id", type: "uuid" },
    doctorId: { name: "doctor_id", type: "uuid", nullable: true },
    sessionDate: { name: "session_date", type: "date" },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
  },
  indices: [{ name: "UQ_queue_sessions_scope_date", columns: ["clinicId", "doctorId", "sessionDate"], unique: true }],
});

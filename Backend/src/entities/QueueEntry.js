import { EntitySchema } from "typeorm";

export const QueueEntry = new EntitySchema({
  name: "QueueEntry", tableName: "queue_entries",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    registrationId: { name: "registration_id", type: "uuid", unique: true },
    sessionId: { name: "session_id", type: "uuid" },
    tokenNumber: { name: "token_number", type: "int" },
    status: { type: "varchar", length: 24, default: "waiting" },
    checkedInAt: { name: "checked_in_at", type: "timestamptz", nullable: true },
    calledAt: { name: "called_at", type: "timestamptz", nullable: true },
    consultationStartedAt: { name: "consultation_started_at", type: "timestamptz", nullable: true },
    completedAt: { name: "completed_at", type: "timestamptz", nullable: true },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
  },
  indices: [{ name: "UQ_queue_entries_session_token", columns: ["sessionId", "tokenNumber"], unique: true }],
});

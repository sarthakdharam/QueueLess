import { EntitySchema } from "typeorm";

export const ReturnEvent = new EntitySchema({
  name: "ReturnEvent", tableName: "return_events",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    registrationId: { name: "registration_id", type: "uuid" },
    queueEntryId: { name: "queue_entry_id", type: "uuid" },
    actorId: { name: "actor_id", type: "uuid" },
    appliedPolicy: { name: "applied_policy", type: "varchar", length: 32 },
    patientsAhead: { name: "patients_ahead", type: "int" },
    assignedOrder: { name: "assigned_order", type: "bigint" },
    overrideReason: { name: "override_reason", type: "varchar", length: 500, nullable: true },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
  },
});

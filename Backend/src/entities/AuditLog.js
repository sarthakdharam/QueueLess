import { EntitySchema } from "typeorm";

export const AuditLog = new EntitySchema({
  name: "AuditLog", tableName: "audit_logs",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    clinicId: { name: "clinic_id", type: "uuid" },
    actorId: { name: "actor_id", type: "uuid" },
    action: { type: "varchar", length: 60 },
    entityType: { name: "entity_type", type: "varchar", length: 60 },
    entityId: { name: "entity_id", type: "uuid" },
    metadata: { type: "jsonb", default: () => "'{}'::jsonb" },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
  },
  indices: [{ name: "IDX_audit_logs_clinic_created", columns: ["clinicId", "createdAt"] }],
});

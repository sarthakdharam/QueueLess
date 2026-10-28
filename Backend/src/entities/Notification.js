import { EntitySchema } from "typeorm";

export const Notification = new EntitySchema({
  name: "Notification", tableName: "notifications",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    clinicId: { name: "clinic_id", type: "uuid" },
    registrationId: { name: "registration_id", type: "uuid", nullable: true },
    channel: { type: "varchar", length: 24, default: "whatsapp" },
    type: { type: "varchar", length: 64 },
    idempotencyKey: { name: "idempotency_key", type: "varchar", length: 180, unique: true },
    deliveryStatus: { name: "delivery_status", type: "varchar", length: 24, default: "pending" },
    providerReference: { name: "provider_reference", type: "varchar", length: 180, nullable: true },
    failureReason: { name: "failure_reason", type: "text", nullable: true },
    retryCount: { name: "retry_count", type: "int", default: 0 },
    payload: { type: "jsonb", default: () => "'{}'::jsonb" },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
    deliveredAt: { name: "delivered_at", type: "timestamptz", nullable: true },
  },
  indices: [{ name: "IDX_notifications_clinic_created", columns: ["clinicId", "createdAt"] }],
});

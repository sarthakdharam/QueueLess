import { EntitySchema } from "typeorm";

export const Payment = new EntitySchema({
  name: "Payment", tableName: "payments",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    clinicId: { name: "clinic_id", type: "uuid" },
    subscriptionId: { name: "subscription_id", type: "uuid" },
    amount: { type: "int" },
    currency: { type: "varchar", length: 3, default: "INR" },
    status: { type: "varchar", length: 24 },
    provider: { type: "varchar", length: 24, default: "simulator" },
    providerReference: { name: "provider_reference", type: "varchar", length: 180, nullable: true, unique: true },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
  },
});

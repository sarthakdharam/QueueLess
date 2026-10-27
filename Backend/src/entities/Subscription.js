import { EntitySchema } from "typeorm";

export const Subscription = new EntitySchema({
  name: "Subscription",
  tableName: "subscriptions",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    clinicId: { name: "clinic_id", type: "uuid", unique: true },
    plan: { type: "varchar", length: 40, default: "base" },
    status: { type: "varchar", length: 24, default: "trial" },
    trialStart: { name: "trial_start", type: "timestamptz" },
    trialEnd: { name: "trial_end", type: "timestamptz" },
    renewalDate: { name: "renewal_date", type: "timestamptz", nullable: true },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
  },
  relations: {
    clinic: { type: "one-to-one", target: "Clinic", joinColumn: { name: "clinic_id" }, onDelete: "CASCADE" },
  },
});

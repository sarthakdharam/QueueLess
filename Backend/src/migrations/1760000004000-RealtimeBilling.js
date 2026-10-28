export class RealtimeBilling1760000004000 {
  name = "RealtimeBilling1760000004000";

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE "registrations" ADD COLUMN "consent_to_contact" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`CREATE TABLE "notifications" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "clinic_id" uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
      "registration_id" uuid REFERENCES "registrations"("id") ON DELETE SET NULL, "channel" varchar(24) NOT NULL DEFAULT 'whatsapp',
      "type" varchar(64) NOT NULL, "idempotency_key" varchar(180) NOT NULL UNIQUE, "delivery_status" varchar(24) NOT NULL DEFAULT 'pending',
      "provider_reference" varchar(180), "failure_reason" text, "retry_count" int NOT NULL DEFAULT 0,
      "payload" jsonb NOT NULL DEFAULT '{}'::jsonb, "created_at" timestamptz NOT NULL DEFAULT now(), "delivered_at" timestamptz
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_clinic_created" ON "notifications" ("clinic_id", "created_at" DESC)`);
    await queryRunner.query(`CREATE TABLE "payments" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "clinic_id" uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
      "subscription_id" uuid NOT NULL REFERENCES "subscriptions"("id") ON DELETE CASCADE, "amount" int NOT NULL,
      "currency" varchar(3) NOT NULL DEFAULT 'INR', "status" varchar(24) NOT NULL, "provider" varchar(24) NOT NULL DEFAULT 'simulator',
      "provider_reference" varchar(180) UNIQUE, "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE "return_events" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "registration_id" uuid NOT NULL REFERENCES "registrations"("id") ON DELETE CASCADE,
      "queue_entry_id" uuid NOT NULL REFERENCES "queue_entries"("id") ON DELETE CASCADE, "actor_id" uuid NOT NULL REFERENCES "clinic_users"("id"),
      "applied_policy" varchar(32) NOT NULL, "patients_ahead" int NOT NULL, "assigned_order" bigint NOT NULL,
      "override_reason" varchar(500), "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE "return_events"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP INDEX "IDX_notifications_clinic_created"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN "consent_to_contact"`);
  }
}

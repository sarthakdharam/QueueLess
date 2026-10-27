export class PatientPortal1760000002000 {
  name = "PatientPortal1760000002000";

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE "patients" ADD COLUMN "contact_consent" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "patients" ADD COLUMN "consent_at" timestamptz`);
    await queryRunner.query(`ALTER TABLE "registrations" ADD COLUMN "idempotency_key" varchar(64) UNIQUE`);
    await queryRunner.query(`CREATE TABLE "appointments" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "registration_id" uuid NOT NULL UNIQUE REFERENCES "registrations"("id") ON DELETE CASCADE,
      "clinic_id" uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
      "doctor_id" uuid NOT NULL REFERENCES "doctors"("id"),
      "patient_id" uuid NOT NULL REFERENCES "patients"("id"),
      "scheduled_at" timestamptz NOT NULL, "slot_minutes" int NOT NULL,
      "status" varchar(24) NOT NULL DEFAULT 'booked',
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_appointments_clinic_time" ON "appointments" ("clinic_id", "scheduled_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_appointments_doctor_time" ON "appointments" ("doctor_id", "scheduled_at")`);
    await queryRunner.query(`CREATE TABLE "patient_access_tokens" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "registration_id" uuid NOT NULL REFERENCES "registrations"("id") ON DELETE CASCADE,
      "token_hash" char(64) NOT NULL UNIQUE, "expires_at" timestamptz NOT NULL,
      "revoked_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(), "last_accessed_at" timestamptz
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_patient_access_registration" ON "patient_access_tokens" ("registration_id")`);
    await queryRunner.query(`CREATE TABLE "otp_challenges" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "mobile" varchar(20) NOT NULL,
      "challenge_hash" char(64) NOT NULL, "expires_at" timestamptz NOT NULL,
      "attempt_count" int NOT NULL DEFAULT 0, "verified_at" timestamptz, "consumed_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_otp_mobile_created" ON "otp_challenges" ("mobile", "created_at")`);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE "otp_challenges"`);
    await queryRunner.query(`DROP TABLE "patient_access_tokens"`);
    await queryRunner.query(`DROP INDEX "IDX_appointments_doctor_time"`);
    await queryRunner.query(`DROP INDEX "IDX_appointments_clinic_time"`);
    await queryRunner.query(`DROP TABLE "appointments"`);
    await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN "idempotency_key"`);
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "consent_at"`);
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "contact_consent"`);
  }
}

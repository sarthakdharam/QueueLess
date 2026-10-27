export class ClinicOperations1760000001000 {
  name = "ClinicOperations1760000001000";

  async up(queryRunner) {
    await queryRunner.query(`CREATE TABLE "clinic_settings" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "clinic_id" uuid NOT NULL UNIQUE REFERENCES "clinics"("id") ON DELETE CASCADE,
      "working_hours" jsonb NOT NULL DEFAULT '{}'::jsonb, "breaks" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "slot_duration_minutes" int NOT NULL DEFAULT 15, "appointment_capacity" int NOT NULL DEFAULT 4,
      "walk_ins_enabled" boolean NOT NULL DEFAULT true, "notify_at_patients_ahead" int NOT NULL DEFAULT 3,
      "missed_turn_policy" varchar(32) NOT NULL DEFAULT 'after_waiting', "return_patients_ahead" int NOT NULL DEFAULT 5,
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE "doctors" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "clinic_id" uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
      "name" varchar(160) NOT NULL, "specialization" varchar(120), "details" text,
      "availability" jsonb NOT NULL DEFAULT '{}'::jsonb, "status" varchar(24) NOT NULL DEFAULT 'active',
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_doctors_clinic_id" ON "doctors" ("clinic_id")`);
    await queryRunner.query(`CREATE TABLE "patients" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" varchar(160) NOT NULL, "mobile" varchar(20) NOT NULL UNIQUE,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE "queue_sessions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "clinic_id" uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
      "doctor_id" uuid REFERENCES "doctors"("id") ON DELETE SET NULL, "session_date" date NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_queue_sessions_scope_date" ON "queue_sessions" ("clinic_id", COALESCE("doctor_id", '00000000-0000-0000-0000-000000000000'::uuid), "session_date")`);
    await queryRunner.query(`CREATE TABLE "registrations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "reference" varchar(16) NOT NULL UNIQUE,
      "clinic_id" uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
      "doctor_id" uuid REFERENCES "doctors"("id") ON DELETE SET NULL, "patient_id" uuid NOT NULL REFERENCES "patients"("id"),
      "visit_type" varchar(24) NOT NULL DEFAULT 'walk_in', "notes" varchar(500), "status" varchar(24) NOT NULL DEFAULT 'waiting',
      "created_at" timestamptz NOT NULL DEFAULT now(), "completed_at" timestamptz
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_registrations_clinic_status" ON "registrations" ("clinic_id", "status")`);
    await queryRunner.query(`CREATE TABLE "queue_entries" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "registration_id" uuid NOT NULL UNIQUE REFERENCES "registrations"("id") ON DELETE CASCADE,
      "session_id" uuid NOT NULL REFERENCES "queue_sessions"("id") ON DELETE CASCADE, "token_number" int NOT NULL,
      "status" varchar(24) NOT NULL DEFAULT 'waiting', "checked_in_at" timestamptz, "called_at" timestamptz,
      "consultation_started_at" timestamptz, "completed_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_queue_entries_session_token" UNIQUE ("session_id", "token_number")
    )`);
    await queryRunner.query(`CREATE TABLE "audit_logs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "clinic_id" uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
      "actor_id" uuid NOT NULL REFERENCES "clinic_users"("id"), "action" varchar(60) NOT NULL,
      "entity_type" varchar(60) NOT NULL, "entity_id" uuid NOT NULL, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_clinic_created" ON "audit_logs" ("clinic_id", "created_at")`);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "queue_entries"`);
    await queryRunner.query(`DROP TABLE "registrations"`);
    await queryRunner.query(`DROP INDEX "UQ_queue_sessions_scope_date"`);
    await queryRunner.query(`DROP TABLE "queue_sessions"`);
    await queryRunner.query(`DROP TABLE "patients"`);
    await queryRunner.query(`DROP INDEX "IDX_doctors_clinic_id"`);
    await queryRunner.query(`DROP TABLE "doctors"`);
    await queryRunner.query(`DROP TABLE "clinic_settings"`);
  }
}

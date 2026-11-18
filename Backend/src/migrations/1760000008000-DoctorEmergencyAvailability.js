export class DoctorEmergencyAvailability1760000008000 {
  name = "DoctorEmergencyAvailability1760000008000";

  async up(queryRunner) {
    await queryRunner.query(`CREATE TABLE "doctor_availability_events" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "clinic_id" uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
      "doctor_id" uuid NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
      "mode" varchar(32) NOT NULL,
      "starts_at" timestamptz NOT NULL,
      "ends_at" timestamptz,
      "expected_return_at" timestamptz,
      "note" varchar(500),
      "status" varchar(24) NOT NULL DEFAULT 'active',
      "created_by" uuid NOT NULL REFERENCES "clinic_users"("id"),
      "resumed_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_doctor_availability_active" ON "doctor_availability_events" ("doctor_id", "status", "starts_at")`,
    );
    await queryRunner.query(`CREATE TABLE "appointment_reschedules" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "appointment_id" uuid NOT NULL REFERENCES "appointments"("id") ON DELETE CASCADE,
      "availability_event_id" uuid REFERENCES "doctor_availability_events"("id") ON DELETE SET NULL,
      "previous_scheduled_at" timestamptz NOT NULL,
      "new_scheduled_at" timestamptz NOT NULL,
      "changed_by" varchar(24) NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_appointment_reschedules_appointment" ON "appointment_reschedules" ("appointment_id", "created_at")`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE "appointment_reschedules"`);
    await queryRunner.query(`DROP TABLE "doctor_availability_events"`);
  }
}

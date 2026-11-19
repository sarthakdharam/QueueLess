export class AppointmentFeedback1760000009000 {
  name = "AppointmentFeedback1760000009000";

  async up(queryRunner) {
    await queryRunner.query(`CREATE TABLE "appointment_feedback" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "registration_id" uuid NOT NULL UNIQUE REFERENCES "registrations"("id") ON DELETE CASCADE,
      "clinic_id" uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
      "rating" smallint NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
      "categories" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "comment" varchar(1000),
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_appointment_feedback_clinic" ON "appointment_feedback" ("clinic_id", "created_at")`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE "appointment_feedback"`);
  }
}

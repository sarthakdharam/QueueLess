export class InitialFoundation1760000000000 {
  name = "InitialFoundation1760000000000";

  async up(queryRunner) {
    await queryRunner.query(`CREATE TABLE "clinics" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" varchar(160) NOT NULL,
      "address" text NOT NULL, "city" varchar(100) NOT NULL, "state" varchar(100) NOT NULL,
      "contact_number" varchar(20) NOT NULL, "email" varchar(255) NOT NULL UNIQUE,
      "time_zone" varchar(64) NOT NULL DEFAULT 'Asia/Kolkata', "status" varchar(24) NOT NULL DEFAULT 'active',
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE "clinic_users" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "clinic_id" uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
      "name" varchar(160) NOT NULL, "email" varchar(255) NOT NULL UNIQUE, "password_hash" varchar(255) NOT NULL,
      "role" varchar(32) NOT NULL DEFAULT 'administrator', "status" varchar(24) NOT NULL DEFAULT 'active',
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_clinic_users_clinic_id" ON "clinic_users" ("clinic_id")`);
    await queryRunner.query(`CREATE TABLE "subscriptions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "clinic_id" uuid NOT NULL UNIQUE REFERENCES "clinics"("id") ON DELETE CASCADE,
      "plan" varchar(40) NOT NULL DEFAULT 'base', "status" varchar(24) NOT NULL DEFAULT 'trial',
      "trial_start" timestamptz NOT NULL, "trial_end" timestamptz NOT NULL, "renewal_date" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(`DROP INDEX "IDX_clinic_users_clinic_id"`);
    await queryRunner.query(`DROP TABLE "clinic_users"`);
    await queryRunner.query(`DROP TABLE "clinics"`);
  }
}

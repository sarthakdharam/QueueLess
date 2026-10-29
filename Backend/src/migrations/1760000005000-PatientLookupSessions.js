export class PatientLookupSessions1760000005000 {
  name = "PatientLookupSessions1760000005000";

  async up(queryRunner) {
    await queryRunner.query(`CREATE TABLE "patient_lookup_sessions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "mobile" varchar(20) NOT NULL,
      "token_hash" char(64) NOT NULL UNIQUE,
      "expires_at" timestamptz NOT NULL,
      "revoked_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "last_accessed_at" timestamptz
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_patient_lookup_mobile_created" ON "patient_lookup_sessions" ("mobile", "created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_patient_lookup_expiry" ON "patient_lookup_sessions" ("expires_at")`);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX "IDX_patient_lookup_expiry"`);
    await queryRunner.query(`DROP INDEX "IDX_patient_lookup_mobile_created"`);
    await queryRunner.query(`DROP TABLE "patient_lookup_sessions"`);
  }
}

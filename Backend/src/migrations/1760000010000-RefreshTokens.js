export class RefreshTokens1760000010000 {
  name = "RefreshTokens1760000010000";

  async up(queryRunner) {
    await queryRunner.query(`CREATE TABLE "refresh_tokens" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL REFERENCES "clinic_users"("id") ON DELETE CASCADE,
      "clinic_id" uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
      "token_hash" varchar(64) NOT NULL UNIQUE,
      "expires_at" timestamptz NOT NULL,
      "revoked_at" timestamptz,
      "replaced_by_id" uuid,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "last_used_at" timestamptz
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_user" ON "refresh_tokens" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_expiry" ON "refresh_tokens" ("expires_at")`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}

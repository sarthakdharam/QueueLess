export class ClinicNotificationReadState1760000007000 {
  name = "ClinicNotificationReadState1760000007000";

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN "read_at" timestamptz`);
    await queryRunner.query(`UPDATE "notifications" SET "read_at" = "created_at" WHERE "read_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_clinic_unread" ON "notifications" ("clinic_id") WHERE "read_at" IS NULL`);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX "IDX_notifications_clinic_unread"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "read_at"`);
  }
}

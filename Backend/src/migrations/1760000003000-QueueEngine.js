export class QueueEngine1760000003000 {
  name = "QueueEngine1760000003000";

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE "queue_entries" ADD COLUMN "queue_order" bigint`);
    await queryRunner.query(`UPDATE "queue_entries" SET "queue_order" = "token_number"::bigint * 1000`);
    await queryRunner.query(`ALTER TABLE "queue_entries" ALTER COLUMN "queue_order" SET NOT NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_queue_entries_session_order" ON "queue_entries" ("session_id", "queue_order")`);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX "IDX_queue_entries_session_order"`);
    await queryRunner.query(`ALTER TABLE "queue_entries" DROP COLUMN "queue_order"`);
  }
}

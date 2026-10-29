export class TruthfulSimulatorDeliveryStatus1760000006000 {
  name = "TruthfulSimulatorDeliveryStatus1760000006000";

  async up(queryRunner) {
    await queryRunner.query(`UPDATE "notifications" SET "delivery_status" = 'simulated', "delivered_at" = NULL WHERE "channel" = 'simulator' AND "delivery_status" = 'delivered'`);
  }

  async down(queryRunner) {
    await queryRunner.query(`UPDATE "notifications" SET "delivery_status" = 'delivered' WHERE "channel" = 'simulator' AND "delivery_status" = 'simulated'`);
  }
}

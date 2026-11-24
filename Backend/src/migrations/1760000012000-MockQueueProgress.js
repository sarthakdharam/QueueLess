export class MockQueueProgress1760000012000 {
  name = "MockQueueProgress1760000012000";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE mock_queue_progress (
        session_id uuid REFERENCES queue_sessions(id) ON DELETE CASCADE,
        registration_id uuid REFERENCES registrations(id) ON DELETE CASCADE,
        closest_ahead int NOT NULL CHECK (closest_ahead BETWEEN 0 AND 5),
        PRIMARY KEY (session_id, registration_id)
      )
    `);
  }

  async down(queryRunner) {
    await queryRunner.query("DROP TABLE mock_queue_progress");
  }
}

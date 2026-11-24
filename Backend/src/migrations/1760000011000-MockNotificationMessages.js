export class MockNotificationMessages1760000011000 {
  name = "MockNotificationMessages1760000011000";

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE notifications ADD COLUMN message text,
        ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
      CREATE INDEX idx_mock_notifications_clinic_created
        ON notifications (clinic_id, created_at DESC, id) WHERE channel = 'simulator';
      CREATE INDEX idx_mock_notifications_registration
        ON notifications (registration_id, created_at DESC) WHERE channel = 'simulator';
      CREATE INDEX idx_mock_notifications_clinic_status
        ON notifications (clinic_id, delivery_status, created_at DESC) WHERE channel = 'simulator';
      CREATE INDEX idx_registrations_clinic_patient ON registrations (clinic_id, patient_id);
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP INDEX idx_registrations_clinic_patient;
      DROP INDEX idx_mock_notifications_clinic_status;
      DROP INDEX idx_mock_notifications_registration;
      DROP INDEX idx_mock_notifications_clinic_created;
      ALTER TABLE notifications DROP COLUMN updated_at, DROP COLUMN message;
    `);
  }
}

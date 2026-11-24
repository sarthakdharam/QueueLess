export function availableConsultationDoctors(database, clinicId, day, doctorId = null) {
  return database.query(
    `SELECT d.id, d.name FROM doctors d
      WHERE d.clinic_id = $1 AND d.status = 'active'
        AND ($3::uuid IS NULL OR d.id = $3)
        AND NOT EXISTS (
          SELECT 1 FROM doctor_availability_events e
          WHERE e.doctor_id = d.id AND e.status = 'active'
            AND e.starts_at <= now() AND (e.ends_at IS NULL OR e.ends_at > now())
        )
        AND NOT EXISTS (
          SELECT 1 FROM registrations r
          JOIN queue_entries q ON q.registration_id = r.id
          JOIN queue_sessions s ON s.id = q.session_id
          WHERE r.clinic_id = d.clinic_id AND r.doctor_id = d.id
            AND q.status = 'in_consultation' AND s.session_date = $2
        )
      ORDER BY d.name, d.id`,
    [clinicId, day, doctorId],
  );
}

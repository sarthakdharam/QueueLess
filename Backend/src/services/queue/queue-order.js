export const queuePriority = "CASE WHEN a.status IN ('booked', 'checked_in') AND a.scheduled_at <= now() THEN 0 WHEN a.scheduled_at IS NULL OR a.status = 'returned' THEN 1 ELSE 2 END";
export const callableAppointment = "(a.id IS NULL OR a.status NOT IN ('needs_attention', 'needs_rescheduling'))";
export const availableDoctor = "NOT EXISTS (SELECT 1 FROM doctor_availability_events e WHERE e.doctor_id = r.doctor_id AND e.status = 'active' AND e.starts_at <= now() AND (e.ends_at IS NULL OR e.ends_at > now()))";

import { AppDataSource } from "../config/data-source.js";
import { Clinic } from "../entities/Clinic.js";
import { clinicToday } from "../services/clinic/time.js";
import { validDate } from "../services/patient/clinic-availability.js";

const clinicDaySessions = `q.session_id = ANY(ARRAY(
  SELECT id FROM queue_sessions WHERE clinic_id = $1 AND session_date = $2
))`;

export async function getClinicAnalytics(req, res, next) {
  try {
    const clinic = await AppDataSource.getRepository(Clinic).findOneBy({
      id: req.auth.clinicId,
    });
    if (!clinic) return res.status(404).json({ error: "Clinic not found." });

    const date =
      req.query.date && validDate(req.query.date)
        ? req.query.date
        : clinicToday(clinic.timeZone);
    const [summary] = await AppDataSource.query(
      `SELECT count(*)::int AS registrations,
              count(*) FILTER (WHERE q.status = 'completed')::int AS completed,
              count(*) FILTER (WHERE q.status = 'waiting')::int AS waiting,
              count(*) FILTER (WHERE q.status = 'missed')::int AS missed,
              round(avg(extract(epoch FROM (q.consultation_started_at - q.checked_in_at)) / 60)
                FILTER (WHERE q.status = 'completed'
                  AND q.checked_in_at IS NOT NULL AND q.consultation_started_at IS NOT NULL))::int AS average_wait_minutes
         FROM queue_entries q
         JOIN registrations r ON r.id = q.registration_id
        WHERE r.clinic_id = $1 AND ${clinicDaySessions}`,
      [req.auth.clinicId, date],
    );
    const [feedback] = await AppDataSource.query(
      `SELECT count(*)::int AS count, round(avg(f.rating)::numeric, 1) AS average_rating
         FROM appointment_feedback f
         JOIN queue_entries q ON q.registration_id = f.registration_id
        WHERE f.clinic_id = $1 AND ${clinicDaySessions}`,
      [req.auth.clinicId, date],
    );
    const busiestHours = await AppDataSource.query(
      `SELECT extract(hour FROM (coalesce(a.scheduled_at, q.created_at) AT TIME ZONE $3))::int AS hour,
              count(*)::int AS visits
         FROM queue_entries q
         JOIN registrations r ON r.id = q.registration_id
         LEFT JOIN appointments a ON a.registration_id = r.id AND a.clinic_id = $1
        WHERE r.clinic_id = $1 AND ${clinicDaySessions}
        GROUP BY hour
        ORDER BY visits DESC, hour ASC
        LIMIT 3`,
      [req.auth.clinicId, date, clinic.timeZone || "Asia/Kolkata"],
    );
    return res.json({
      date,
      clinic: { name: clinic.name, timeZone: clinic.timeZone },
      summary: {
        registrations: Number(summary.registrations || 0),
        completed: Number(summary.completed || 0),
        waiting: Number(summary.waiting || 0),
        missed: Number(summary.missed || 0),
        averageWaitMinutes:
          summary.average_wait_minutes === null
            ? null
            : Number(summary.average_wait_minutes),
        feedbackCount: Number(feedback.count || 0),
        averageRating:
          feedback.average_rating === null
            ? null
            : Number(feedback.average_rating),
      },
      busiestHours: busiestHours.map((row) => ({
        hour: Number(row.hour),
        visits: Number(row.visits),
      })),
    });
  } catch (error) {
    return next(error);
  }
}

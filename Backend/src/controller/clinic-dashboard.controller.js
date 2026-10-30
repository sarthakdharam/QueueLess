import { AppDataSource } from "../config/data-source.js";
import { Clinic } from "../entities/Clinic.js";
import { QueueEntry } from "../entities/QueueEntry.js";
import { clinicToday } from "../services/clinic/time.js";

const ACTIVE_QUEUE_STATUSES = ["registered", "waiting", "called", "in_consultation", "missed"];

export async function getDashboard(req, res, next) {
  try {
    const clinic = await AppDataSource.getRepository(Clinic).findOneBy({ id: req.auth.clinicId });
    const day = clinicToday(clinic.timeZone);
    const queue = await AppDataSource.getRepository(QueueEntry).createQueryBuilder("q")
      .innerJoin("registrations", "r", "r.id = q.registration_id")
      .innerJoin("patients", "p", "p.id = r.patient_id")
      .leftJoin("doctors", "d", "d.id = r.doctor_id")
      .leftJoin("appointments", "a", "a.registration_id = r.id")
      .innerJoin("queue_sessions", "s", "s.id = q.session_id")
      .where("r.clinic_id = :clinicId AND s.session_date = :day", { clinicId: req.auth.clinicId, day })
      .select(["q.id AS queue_id", "q.token_number AS token_number", "q.queue_order AS queue_order", "q.status AS queue_status", "q.created_at AS registered_at", "r.id AS registration_id", "r.reference AS reference", "r.status AS status", "r.visit_type AS visit_type", "p.name AS patient_name", "p.mobile AS patient_mobile", "d.name AS doctor_name", "a.scheduled_at AS scheduled_at"])
      .orderBy("CASE WHEN a.status IN ('booked', 'checked_in') AND a.scheduled_at <= now() THEN 0 WHEN a.scheduled_at IS NULL OR a.status = 'returned' THEN 1 ELSE 2 END", "ASC")
      .addOrderBy("a.scheduled_at", "ASC", "NULLS LAST").addOrderBy("q.queue_order", "ASC").getRawMany();
    const visibleQueue = queue.filter((entry) => ACTIVE_QUEUE_STATUSES.includes(entry.queue_status));
    let position = 0;
    const positionedQueue = visibleQueue.map((entry) => {
      if (entry.queue_status === "waiting") position += 1;
      return { ...entry, position: entry.queue_status === "waiting" ? position : null };
    });
    const waiting = queue.filter((entry) => entry.queue_status === "waiting").length;
    const countByQueueStatus = (status) => queue.filter((entry) => entry.queue_status === status).length;
    return res.json({ date: day, summary: { registrations: queue.length, waiting, consulting: countByQueueStatus("in_consultation"), completed: countByQueueStatus("completed"), missed: countByQueueStatus("missed"), cancelled: countByQueueStatus("cancelled") }, queue: positionedQueue });
  } catch (error) { return next(error); }

}

import { AppDataSource } from "../config/data-source.js";
import { Clinic } from "../entities/Clinic.js";
import { ClinicSettings } from "../entities/ClinicSettings.js";
import { QueueEntry } from "../entities/QueueEntry.js";
import { clinicToday } from "../services/clinic/time.js";
import { validDate } from "../services/patient/clinic-availability.js";

const ACTIVE_QUEUE_STATUSES = [
  "registered",
  "waiting",
  "called",
  "in_consultation",
  "missed",
];

export async function getDashboard(req, res, next) {
  try {
    const clinic = await AppDataSource.getRepository(Clinic).findOneBy({
      id: req.auth.clinicId,
    });
    const today = clinicToday(clinic.timeZone);
    const day =
      req.query.date && validDate(req.query.date) ? req.query.date : today;
    const settings = await AppDataSource.getRepository(
      ClinicSettings,
    ).findOneBy({ clinicId: clinic.id });
    const queue = await AppDataSource.getRepository(QueueEntry)
      .createQueryBuilder("q")
      .innerJoin("registrations", "r", "r.id = q.registration_id")
      .innerJoin("patients", "p", "p.id = r.patient_id")
      .leftJoin("doctors", "d", "d.id = r.doctor_id")
      .leftJoin("appointments", "a", "a.registration_id = r.id AND a.clinic_id = :clinicId")
      .where("r.clinic_id = :clinicId", {
        clinicId: req.auth.clinicId,
        day,
      })
      .andWhere(`q.session_id = ANY(ARRAY(
        SELECT id FROM queue_sessions WHERE clinic_id = :clinicId AND session_date = :day
      ))`)
      .select([
        "q.id AS queue_id",
        "q.token_number AS token_number",
        "q.queue_order AS queue_order",
        "q.status AS queue_status",
        "q.consultation_started_at AS consultation_started_at",
        "q.created_at AS registered_at",
        "r.id AS registration_id",
        "r.reference AS reference",
        "r.status AS status",
        "r.visit_type AS visit_type",
        "r.consent_to_contact AS consent_to_contact",
        "p.name AS patient_name",
        "p.mobile AS patient_mobile",
        "d.name AS doctor_name",
        "a.scheduled_at AS scheduled_at",
      ])
      .orderBy(
        "CASE WHEN a.status IN ('booked', 'checked_in') AND a.scheduled_at <= now() THEN 0 WHEN a.scheduled_at IS NULL OR a.status = 'returned' THEN 1 ELSE 2 END",
        "ASC",
      )
      .addOrderBy("a.scheduled_at", "ASC", "NULLS LAST")
      .addOrderBy("q.queue_order", "ASC")
      .getRawMany();
    const visibleQueue = queue.filter((entry) =>
      ACTIVE_QUEUE_STATUSES.includes(entry.queue_status),
    );
    let position = 0;
    const consultation = queue.find(
      (entry) => entry.queue_status === "in_consultation",
    );
    const duration = settings?.slotDurationMinutes || 15;
    const elapsed = consultation?.consultation_started_at
      ? Math.max(
          0,
          Math.floor(
            (Date.now() -
              new Date(consultation.consultation_started_at).getTime()) /
              60000,
          ),
        )
      : 0;
    const activeRemaining = consultation ? Math.max(0, duration - elapsed) : 0;
    const positionedQueue = visibleQueue.map((entry) => {
      if (entry.queue_status === "waiting") position += 1;
      const estimatedWaitMinutes =
        entry.queue_status === "waiting" && day === today
          ? Math.max(0, (position - 1) * duration + activeRemaining)
          : null;
      return {
        ...entry,
        position: entry.queue_status === "waiting" ? position : null,
        estimatedWaitMinutes,
        estimatedWaitMaximumMinutes:
          estimatedWaitMinutes === null
            ? null
            : estimatedWaitMinutes + duration + 10,
      };
    });
    const waiting = queue.filter(
      (entry) => entry.queue_status === "waiting",
    ).length;
    const countByQueueStatus = (status) =>
      queue.filter((entry) => entry.queue_status === status).length;
    return res.json({
      date: day,
      todayDate: today,
      isToday: day === today,
      summary: {
        registrations: queue.length,
        waiting,
        consulting: countByQueueStatus("in_consultation"),
        completed: countByQueueStatus("completed"),
        missed: countByQueueStatus("missed"),
        cancelled: countByQueueStatus("cancelled"),
      },
      queue: positionedQueue,
    });
  } catch (error) {
    return next(error);
  }
}

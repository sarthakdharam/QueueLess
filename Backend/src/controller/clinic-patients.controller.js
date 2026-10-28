import { AppDataSource } from "../config/data-source.js";
import { Clinic } from "../entities/Clinic.js";
import { QueueEntry } from "../entities/QueueEntry.js";
import { clinicToday } from "../services/clinic/time.js";
import { HISTORY_EXCLUDED_TODAY } from "../services/clinic/patient-history.js";

const visitDateSql = "COALESCE((a.scheduled_at AT TIME ZONE :timeZone)::date, s.session_date)";
const visitStatusSql = "CASE WHEN q.status = 'waiting' AND rr.queue_entry_id IS NOT NULL THEN 'returned' ELSE q.status END";

function queueVisits(clinicId, timeZone) {
  return AppDataSource.getRepository(QueueEntry).createQueryBuilder("q")
    .innerJoin("registrations", "r", "r.id = q.registration_id")
    .innerJoin("patients", "p", "p.id = r.patient_id")
    .innerJoin("queue_sessions", "s", "s.id = q.session_id")
    .leftJoin("doctors", "d", "d.id = r.doctor_id")
    .leftJoin("appointments", "a", "a.registration_id = r.id")
    .leftJoin((subQuery) => subQuery.select("return_event.queue_entry_id", "queue_entry_id").distinctOn(["return_event.queue_entry_id"]).from("return_events", "return_event").orderBy("return_event.queue_entry_id", "ASC").addOrderBy("return_event.created_at", "DESC"), "rr", "rr.queue_entry_id = q.id")
    .where("r.clinic_id = :clinicId", { clinicId })
    .setParameter("timeZone", timeZone);
}

function patientColumns(query) {
  return query.select([
    "q.id AS queue_id", "q.session_id AS session_id", "q.token_number AS token_number", "q.status AS queue_status",
    "q.checked_in_at AS checked_in_at", "q.created_at AS registered_at", "q.completed_at AS completed_at",
    "r.id AS registration_id", "r.reference AS reference", "r.visit_type AS visit_type", "r.status AS registration_status",
    "p.name AS patient_name", "d.name AS doctor_name", "a.scheduled_at AS scheduled_at", "a.status AS appointment_status",
  ]).addSelect(visitDateSql, "visit_date").addSelect(visitStatusSql, "visit_status");
}

export async function getTodaysPatients(req, res, next) {
  try {
    const clinic = await AppDataSource.getRepository(Clinic).findOneBy({ id: req.auth.clinicId });
    if (!clinic) return res.status(404).json({ error: "Clinic not found." });
    const timeZone = clinic.timeZone || "Asia/Kolkata";
    const day = clinicToday(timeZone);
    const query = patientColumns(queueVisits(req.auth.clinicId, timeZone))
      .andWhere("s.session_date = :day", { day })
      .orderBy("s.id", "ASC")
      .addOrderBy("CASE WHEN a.status IN ('booked', 'checked_in') AND a.scheduled_at <= now() THEN 0 WHEN a.scheduled_at IS NULL OR a.status = 'returned' THEN 1 ELSE 2 END", "ASC")
      .addOrderBy("a.scheduled_at", "ASC", "NULLS LAST")
      .addOrderBy("q.queue_order", "ASC");
    if (req.query.q) query.andWhere("(p.name ILIKE :search OR r.reference ILIKE :search)", { search: `%${req.query.q}%` });
    if (req.query.status) query.andWhere(`${visitStatusSql} = :status`, { status: req.query.status });
    const rows = await query.getRawMany();
    const positions = new Map();
    const patients = rows.map((row) => {
      let position = null;
      if (row.queue_status === "waiting") {
        position = (positions.get(row.session_id) || 0) + 1;
        positions.set(row.session_id, position);
      }
      return { ...row, position, arrival_status: row.checked_in_at ? "Arrived" : "Not arrived" };
    });
    return res.json({ date: day, timeZone, patients });
  } catch (error) { return next(error); }
}

export async function getPatientHistory(req, res, next) {
  try {
    const clinic = await AppDataSource.getRepository(Clinic).findOneBy({ id: req.auth.clinicId });
    if (!clinic) return res.status(404).json({ error: "Clinic not found." });
    const timeZone = clinic.timeZone || "Asia/Kolkata";
    const today = clinicToday(timeZone);
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 25);
    const query = patientColumns(queueVisits(req.auth.clinicId, timeZone))
      .andWhere(`(${visitDateSql} < :today OR q.status NOT IN (:...activeStatuses))`, { today, activeStatuses: HISTORY_EXCLUDED_TODAY })
      .orderBy(visitDateSql, "DESC")
      .addOrderBy("COALESCE(q.completed_at, r.completed_at, a.scheduled_at, r.created_at)", "DESC")
      .addOrderBy("q.id", "DESC");
    if (req.query.from) query.andWhere(`${visitDateSql} >= :fromDate`, { fromDate: req.query.from });
    if (req.query.to) query.andWhere(`${visitDateSql} <= :toDate`, { toDate: req.query.to });
    if (req.query.status) query.andWhere(`${visitStatusSql} = :status`, { status: req.query.status });
    if (req.query.q) query.andWhere("(p.name ILIKE :search OR r.reference ILIKE :search)", { search: `%${req.query.q}%` });
    const total = await query.clone().getCount();
    const records = await query.offset((page - 1) * limit).limit(limit).getRawMany();
    return res.json({ timeZone, page, limit, total, pages: Math.ceil(total / limit), records });
  } catch (error) { return next(error); }
}

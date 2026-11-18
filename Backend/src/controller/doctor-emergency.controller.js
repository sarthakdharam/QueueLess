import { AppDataSource } from "../config/data-source.js";
import { Doctor } from "../entities/Doctor.js";
import { Clinic } from "../entities/Clinic.js";
import { Appointment } from "../entities/Appointment.js";
import { DoctorAvailabilityEvent } from "../entities/DoctorAvailabilityEvent.js";
import { AuditLog } from "../entities/AuditLog.js";
import { EMERGENCY_MODES } from "../services/clinic/doctor-emergencies.js";
import { dispatchNotification } from "../services/notifications/dispatch.js";
import { emitQueueChange } from "../sockets/socket-server.js";
import { addDays, dateInZone, zonedTimeToUtc } from "../services/patient/clinic-availability.js";

const ACTIVE_APPOINTMENT_STATUSES = ["booked", "checked_in", "needs_attention", "needs_rescheduling"];

function safeEvent(event) {
  return { id: event.id, doctorId: event.doctorId, mode: event.mode, startsAt: event.startsAt, endsAt: event.endsAt, expectedReturnAt: event.expectedReturnAt, note: event.note, status: event.status, resumedAt: event.resumedAt, createdAt: event.createdAt };
}

export async function getDoctorEmergencyBoard(req, res, next) {
  try {
    const [doctors, events, affected] = await Promise.all([
      AppDataSource.getRepository(Doctor).find({ where: { clinicId: req.auth.clinicId, status: "active" }, order: { name: "ASC" } }),
      AppDataSource.getRepository(DoctorAvailabilityEvent).find({ where: { clinicId: req.auth.clinicId }, order: { createdAt: "DESC" }, take: 50 }),
      AppDataSource.query(`SELECT a.doctor_id, count(*)::int AS count FROM appointments a WHERE a.clinic_id = $1 AND a.status IN ('needs_attention', 'needs_rescheduling') GROUP BY a.doctor_id`, [req.auth.clinicId]),
    ]);
    const counts = new Map(affected.map((row) => [row.doctor_id, Number(row.count)]));
    return res.json({ doctors: doctors.map((doctor) => ({ id: doctor.id, name: doctor.name, specialization: doctor.specialization, affectedPatients: counts.get(doctor.id) || 0 })), events: events.map(safeEvent) });
  } catch (error) { return next(error); }
}

export async function createDoctorEmergency(req, res, next) {
  const { mode, startsAt, endsAt, expectedReturnAt, note } = req.body;
  try {
    if (!EMERGENCY_MODES.includes(mode)) return res.status(400).json({ error: "Choose a valid availability status." });
    let start = new Date(startsAt);
    let end = endsAt ? new Date(endsAt) : null;
    if (!Number.isFinite(start.getTime()) || (mode !== "full_day" && end && (!Number.isFinite(end.getTime()) || end <= start))) return res.status(400).json({ error: "Provide a valid unavailable period." });
    if (mode === "temporary" && !end) return res.status(400).json({ error: "Temporary unavailability requires an end time." });
    const event = await AppDataSource.transaction(async (manager) => {
      const doctor = await manager.getRepository(Doctor).findOneBy({ id: req.params.doctorId, clinicId: req.auth.clinicId, status: "active" });
      if (!doctor) throw Object.assign(new Error("Doctor not found."), { status: 404 });
      if (mode === "full_day") {
        const clinic = await manager.getRepository(Clinic).findOneBy({ id: req.auth.clinicId });
        const day = dateInZone(new Date(), clinic?.timeZone || "Asia/Kolkata");
        start = zonedTimeToUtc(day, "00:00", clinic?.timeZone || "Asia/Kolkata");
        end = zonedTimeToUtc(addDays(day, 1), "00:00", clinic?.timeZone || "Asia/Kolkata");
      }
      const created = await manager.getRepository(DoctorAvailabilityEvent).save(manager.getRepository(DoctorAvailabilityEvent).create({ clinicId: req.auth.clinicId, doctorId: doctor.id, mode, startsAt: start, endsAt: end, expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt) : null, note: note?.trim() || null, createdBy: req.auth.sub }));
      const appointmentStatus = mode === "full_day" ? "needs_rescheduling" : "needs_attention";
      const affected = await manager.getRepository(Appointment).createQueryBuilder("a")
        .innerJoin("registrations", "r", "r.id = a.registration_id").innerJoin("patients", "p", "p.id = a.patient_id")
        .where("a.clinic_id = :clinicId AND a.doctor_id = :doctorId AND a.status IN (:...statuses)", { clinicId: req.auth.clinicId, doctorId: doctor.id, statuses: ACTIVE_APPOINTMENT_STATUSES })
        .andWhere("a.scheduled_at >= :start AND (CAST(:end AS timestamptz) IS NULL OR a.scheduled_at < CAST(:end AS timestamptz))", { start, end })
        .select(["a.id AS appointment_id", "a.registration_id AS registration_id", "p.mobile AS mobile", "r.consent_to_contact AS consent_to_contact", "p.name AS patient_name"]).getRawMany();
      if (affected.length) await manager.getRepository(Appointment).createQueryBuilder().update().set({ status: appointmentStatus }).where("id IN (:...ids)", { ids: affected.map((row) => row.appointment_id) }).execute();
      await manager.getRepository(AuditLog).save(manager.getRepository(AuditLog).create({ clinicId: req.auth.clinicId, actorId: req.auth.sub, action: "doctor_emergency_recorded", entityType: "doctor_availability_event", entityId: created.id, metadata: { mode, startsAt: start.toISOString(), endsAt: end?.toISOString() || null, affectedPatients: affected.length } }));
      return { created, doctor, affected, appointmentStatus };
    });
    for (const patient of event.affected.filter((item) => item.consent_to_contact)) {
      void dispatchNotification({ clinicId: req.auth.clinicId, registrationId: patient.registration_id, type: event.appointmentStatus === "needs_rescheduling" ? "doctor_emergency_reschedule" : "doctor_emergency_delay", idempotencyKey: `doctor-emergency:${event.created.id}:${patient.registration_id}`, recipient: patient.mobile, templateName: event.appointmentStatus === "needs_rescheduling" ? "queueless_doctor_reschedule" : "queueless_doctor_delay", variables: [event.doctor.name, event.appointmentStatus === "needs_rescheduling" ? "needs to be rescheduled" : "may be delayed"] }).catch(() => {});
      emitQueueChange({ clinicId: req.auth.clinicId, registrationId: patient.registration_id, status: event.appointmentStatus, type: "appointment:availabilityChanged" });
    }
    return res.status(201).json({ event: safeEvent(event.created), affectedPatients: event.affected.length, appointmentStatus: event.appointmentStatus });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
}

export async function resumeDoctorAvailability(req, res, next) {
  try {
    const event = await AppDataSource.transaction(async (manager) => {
      const record = await manager.getRepository(DoctorAvailabilityEvent).findOneBy({ id: req.params.eventId, clinicId: req.auth.clinicId, status: "active" });
      if (!record) throw Object.assign(new Error("Active availability event not found."), { status: 404 });
      record.status = "resumed"; record.resumedAt = new Date();
      await manager.getRepository(DoctorAvailabilityEvent).save(record);
      await manager.query(`UPDATE appointments a SET status = 'booked', updated_at = now()
        WHERE a.doctor_id = $1 AND a.status IN ('needs_attention', 'needs_rescheduling') AND a.scheduled_at >= $2
        AND NOT EXISTS (SELECT 1 FROM doctor_availability_events e WHERE e.doctor_id = a.doctor_id AND e.status = 'active' AND e.starts_at < a.scheduled_at + (a.slot_minutes * interval '1 minute') AND (e.ends_at IS NULL OR e.ends_at > a.scheduled_at))`, [record.doctorId, record.startsAt]);
      await manager.getRepository(AuditLog).save(manager.getRepository(AuditLog).create({ clinicId: req.auth.clinicId, actorId: req.auth.sub, action: "doctor_availability_resumed", entityType: "doctor_availability_event", entityId: record.id, metadata: {} }));
      return record;
    });
    return res.json({ event: safeEvent(event) });
  } catch (error) { if (error.status) return res.status(error.status).json({ error: error.message }); return next(error); }
}

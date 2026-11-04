import { AppDataSource } from "../config/data-source.js";
import { ClinicSettings } from "../entities/ClinicSettings.js";
import { Registration } from "../entities/Registration.js";
import { PatientAccessToken } from "../entities/PatientAccessToken.js";
import { Appointment } from "../entities/Appointment.js";
import { AppointmentReschedule } from "../entities/AppointmentReschedule.js";
import { QueueSession } from "../entities/QueueSession.js";
import { QueueEntry } from "../entities/QueueEntry.js";
import { createAccess } from "../services/patient/access-links.js";
import { disconnectPatientSockets } from "../sockets/socket-server.js";
import { addDays, availableSlots, dateInZone, loadPublicClinic, zonedTimeToUtc, OPEN_STATUSES } from "../services/patient/clinic-availability.js";
import { activeEmergencyForSlot } from "../services/clinic/doctor-emergencies.js";
import { dispatchNotification } from "../services/notifications/dispatch.js";

export async function getPatientRegistration(req, res, next) {
  try {
    const raw = await AppDataSource.getRepository(Registration).createQueryBuilder("r")
      .innerJoin("clinics", "c", "c.id = r.clinic_id").innerJoin("patients", "p", "p.id = r.patient_id")
      .leftJoin("doctors", "d", "d.id = r.doctor_id").leftJoin("appointments", "a", "a.registration_id = r.id")
      .leftJoin("queue_entries", "q", "q.registration_id = r.id").leftJoin("queue_sessions", "s", "s.id = q.session_id")
      .where("r.id = :id", { id: req.patientAccess.registrationId })
      .select(["r.id AS registration_id", "r.reference AS reference", "r.status AS status", "r.visit_type AS visit_type", "r.consent_to_contact AS consent_to_contact", "r.created_at AS created_at", "p.name AS patient_name", "c.id AS clinic_id", "c.name AS clinic_name", "c.address AS clinic_address", "c.city AS clinic_city", "c.state AS clinic_state", "c.contact_number AS clinic_contact", "c.time_zone AS time_zone", "d.name AS doctor_name", "d.specialization AS specialization", "a.scheduled_at AS scheduled_at", "a.slot_minutes AS slot_minutes", "a.status AS appointment_status", "q.status AS queue_status", "q.token_number AS token_number", "q.session_id AS session_id"])
      .getRawOne();
    if (!raw) return res.status(404).json({ error: "Registration not found." });
    let position = null;
    if (raw.queue_status === "waiting") {
      const ordered = await AppDataSource.getRepository(QueueEntry).createQueryBuilder("q")
        .innerJoin("registrations", "r", "r.id = q.registration_id")
        .leftJoin("appointments", "a", "a.registration_id = r.id")
        .where("q.session_id = :sessionId AND q.status = 'waiting'", { sessionId: raw.session_id })
        .select(["r.id AS registration_id"])
        .orderBy("CASE WHEN a.status IN ('booked', 'checked_in') AND a.scheduled_at <= now() THEN 0 WHEN a.scheduled_at IS NULL OR a.status = 'returned' THEN 1 ELSE 2 END", "ASC")
        .addOrderBy("a.scheduled_at", "ASC", "NULLS LAST").addOrderBy("q.queue_order", "ASC").getRawMany();
      const index = ordered.findIndex((entry) => entry.registration_id === raw.registration_id);
      position = index < 0 ? null : index + 1;
    }
    const settings = await AppDataSource.getRepository(ClinicSettings).findOneBy({ clinicId: raw.clinic_id });
    const timeToAppointment = raw.scheduled_at ? new Date(raw.scheduled_at).toISOString() : null;
    let estimate = null;
    if (position) {
      const duration = settings?.slotDurationMinutes || 15;
      const session = await AppDataSource.getRepository(QueueSession).findOneBy({ id: raw.session_id });
      const consulting = session && await AppDataSource.getRepository(QueueEntry).findOneBy({ sessionId: session.id, status: "in_consultation" });
      const consultationElapsed = consulting?.consultationStartedAt ? Math.max(0, Math.floor((Date.now() - new Date(consulting.consultationStartedAt).getTime()) / 60000)) : 0;
      const activeRemaining = consulting ? Math.max(0, duration - consultationElapsed) : 0;
      const baseMinimum = Math.max(0, (position - 1) * duration + activeRemaining);
      const appointmentDelay = raw.scheduled_at ? Math.max(0, Math.ceil((new Date(raw.scheduled_at).getTime() - Date.now()) / 60000)) : 0;
      const minimumMinutes = Math.max(baseMinimum, appointmentDelay);
      estimate = { minimumMinutes, maximumMinutes: minimumMinutes + duration + 10, disclaimer: "This is an estimate based on queue position and configured slot length; delays may change it." };
    }
    return res.json({ registration: { reference: raw.reference, status: raw.status, visitType: raw.visit_type, tokenNumber: raw.token_number, queueStatus: raw.queue_status, queuePosition: position, createdAt: raw.created_at }, notificationsAllowed: raw.consent_to_contact, patient: { name: raw.patient_name }, clinic: { id: raw.clinic_id, name: raw.clinic_name, address: raw.clinic_address, city: raw.clinic_city, state: raw.clinic_state, contactNumber: raw.clinic_contact, timeZone: raw.time_zone }, doctor: raw.doctor_name ? { name: raw.doctor_name, specialization: raw.specialization } : null, appointment: timeToAppointment ? { scheduledAt: timeToAppointment, slotMinutes: raw.slot_minutes, status: raw.appointment_status } : null, arrivalInstructions: "Online registration does not confirm physical arrival. Please check in with the receptionist when you reach the clinic.", estimate });
  } catch (error) { return next(error); }

}

export async function rotatePatientAccess(req, res, next) {
  try {
    const result = await AppDataSource.transaction((manager) => createAccess(manager, req.patientAccess.registrationId));
    return res.json({ accessUrl: result.url });
  } catch (error) { return next(error); }

}

export async function revokePatientAccess(req, res, next) {
  try {
    await AppDataSource.getRepository(PatientAccessToken).update({ id: req.patientAccess.tokenId }, { revokedAt: new Date() });
    await disconnectPatientSockets(req.patientAccess.registrationId);
    return res.status(204).end();
  } catch (error) { return next(error); }

}

export async function updateNotificationPreference(req, res, next) {
  try {
    await AppDataSource.getRepository(Registration).update({ id: req.patientAccess.registrationId }, { consentToContact: req.body.enabled });
    return res.json({ notificationsAllowed: req.body.enabled });
  } catch (error) { return next(error); }
}

export async function getRescheduleOptions(req, res, next) {
  try {
    const appointment = await AppDataSource.getRepository(Appointment).findOneBy({ registrationId: req.patientAccess.registrationId });
    if (!appointment || appointment.status !== "needs_rescheduling") return res.status(409).json({ error: "This appointment does not currently need rescheduling." });
    const clinicData = await loadPublicClinic(appointment.clinicId);
    const doctor = clinicData?.doctors.find((item) => item.id === appointment.doctorId);
    if (!clinicData || !doctor) return res.status(404).json({ error: "Appointment availability could not be found." });
    const today = dateInZone(new Date(), clinicData.clinic.timeZone || "Asia/Kolkata");
    const days = [];
    for (let offset = 0; offset <= 60 && days.length < 7; offset += 1) {
      const date = addDays(today, offset);
      const slots = await availableSlots({ clinic: clinicData.clinic, settings: clinicData.settings, doctor, date });
      if (slots.length) days.push({ date, slots });
    }
    return res.json({ doctor: { id: doctor.id, name: doctor.name }, days });
  } catch (error) { return next(error); }
}

export async function reschedulePatientAppointment(req, res, next) {
  try {
    const { date, slotTime } = req.body;
    const appointment = await AppDataSource.getRepository(Appointment).findOneBy({ registrationId: req.patientAccess.registrationId });
    if (!appointment || appointment.status !== "needs_rescheduling") return res.status(409).json({ error: "This appointment does not currently need rescheduling." });
    const clinicData = await loadPublicClinic(appointment.clinicId);
    const doctor = clinicData?.doctors.find((item) => item.id === appointment.doctorId);
    if (!clinicData || !doctor) return res.status(404).json({ error: "Appointment availability could not be found." });
    const slot = zonedTimeToUtc(date, slotTime, clinicData.clinic.timeZone || "Asia/Kolkata");
    const allowed = await availableSlots({ clinic: clinicData.clinic, settings: clinicData.settings, doctor, date });
    if (!allowed.some((item) => item.startsAt === slot.toISOString())) return res.status(409).json({ error: "That replacement slot is no longer available. Choose another time." });
    const result = await AppDataSource.transaction(async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`appointment:${appointment.clinicId}:${appointment.doctorId}:${slot.toISOString()}`]);
      const current = await manager.getRepository(Appointment).findOneBy({ id: appointment.id, status: "needs_rescheduling" });
      if (!current) throw Object.assign(new Error("This appointment has already been updated."), { status: 409 });
      if (await activeEmergencyForSlot({ doctorId: current.doctorId, startsAt: slot, endsAt: new Date(slot.getTime() + current.slotMinutes * 60000) })) throw Object.assign(new Error("This doctor is unavailable at that time. Choose another slot."), { status: 409 });
      const count = await manager.getRepository(Appointment).createQueryBuilder("a").where("a.clinic_id = :clinicId AND a.doctor_id = :doctorId AND a.scheduled_at = :slot AND a.status IN (:...statuses)", { clinicId: current.clinicId, doctorId: current.doctorId, slot, statuses: OPEN_STATUSES }).getCount();
      if (count >= clinicData.settings.appointmentCapacity) throw Object.assign(new Error("That replacement slot has just filled. Choose another time."), { status: 409 });
      const queueEntry = await manager.getRepository(QueueEntry).findOneBy({ registrationId: current.registrationId });
      let session = await manager.getRepository(QueueSession).findOneBy({ clinicId: current.clinicId, doctorId: current.doctorId, sessionDate: date });
      if (!session) session = await manager.getRepository(QueueSession).save(manager.getRepository(QueueSession).create({ clinicId: current.clinicId, doctorId: current.doctorId, sessionDate: date }));
      if (queueEntry) {
        const max = await manager.getRepository(QueueEntry).createQueryBuilder("q").where("q.session_id = :sessionId", { sessionId: session.id }).select("MAX(q.token_number)", "max_token").addSelect("MAX(q.queue_order)", "max_order").getRawOne();
        await manager.getRepository(QueueEntry).update({ id: queueEntry.id }, { sessionId: session.id, tokenNumber: Number(max.max_token || 0) + 1, queueOrder: Number(max.max_order || 0) + 1000, status: "registered", checkedInAt: null, calledAt: null, consultationStartedAt: null });
      }
      const oldTime = current.scheduledAt;
      current.scheduledAt = slot; current.status = "booked";
      await manager.getRepository(Appointment).save(current);
      await manager.getRepository(AppointmentReschedule).save(manager.getRepository(AppointmentReschedule).create({ appointmentId: current.id, previousScheduledAt: oldTime, newScheduledAt: slot, changedBy: "patient" }));
      return current;
    });
    const registrationRows = await AppDataSource.query(`SELECT r.clinic_id, r.consent_to_contact, p.mobile FROM registrations r JOIN patients p ON p.id = r.patient_id WHERE r.id = $1`, [result.registrationId]);
    if (registrationRows[0]?.consent_to_contact) void dispatchNotification({ clinicId: result.clinicId, registrationId: result.registrationId, type: "reschedule_confirmation", idempotencyKey: `reschedule:${result.id}:${result.scheduledAt.toISOString()}`, recipient: registrationRows[0].mobile, templateName: "queueless_reschedule_confirmation", variables: [doctor.name, date, slotTime] }).catch(() => {});
    return res.json({ appointment: { scheduledAt: result.scheduledAt, status: result.status, doctor: doctor.name }, message: "Your appointment has been rescheduled." });
  } catch (error) { if (error.status) return res.status(error.status).json({ error: error.message }); return next(error); }
}

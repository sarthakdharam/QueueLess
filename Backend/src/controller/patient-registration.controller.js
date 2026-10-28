import { AppDataSource } from "../config/data-source.js";
import { ClinicSettings } from "../entities/ClinicSettings.js";
import { QueueSession } from "../entities/QueueSession.js";
import { Registration } from "../entities/Registration.js";
import { QueueEntry } from "../entities/QueueEntry.js";
import { PatientAccessToken } from "../entities/PatientAccessToken.js";
import { Appointment } from "../entities/Appointment.js";
import { createAccess } from "../services/patient/access-links.js";

export async function getPatientRegistration(req, res, next) {
  try {
    const raw = await AppDataSource.getRepository(Registration).createQueryBuilder("r")
      .innerJoin("clinics", "c", "c.id = r.clinic_id").innerJoin("patients", "p", "p.id = r.patient_id")
      .leftJoin("doctors", "d", "d.id = r.doctor_id").leftJoin("appointments", "a", "a.registration_id = r.id")
      .leftJoin("queue_entries", "q", "q.registration_id = r.id").leftJoin("queue_sessions", "s", "s.id = q.session_id")
      .where("r.id = :id", { id: req.patientAccess.registrationId })
      .select(["r.id AS registration_id", "r.reference AS reference", "r.status AS status", "r.visit_type AS visit_type", "r.created_at AS created_at", "p.name AS patient_name", "c.id AS clinic_id", "c.name AS clinic_name", "c.address AS clinic_address", "c.city AS clinic_city", "c.state AS clinic_state", "c.contact_number AS clinic_contact", "c.time_zone AS time_zone", "d.name AS doctor_name", "d.specialization AS specialization", "a.scheduled_at AS scheduled_at", "a.slot_minutes AS slot_minutes", "a.status AS appointment_status", "q.status AS queue_status", "q.token_number AS token_number", "q.session_id AS session_id"])
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
    return res.json({ registration: { reference: raw.reference, status: raw.status, visitType: raw.visit_type, tokenNumber: raw.token_number, queueStatus: raw.queue_status, queuePosition: position, createdAt: raw.created_at }, patient: { name: raw.patient_name }, clinic: { id: raw.clinic_id, name: raw.clinic_name, address: raw.clinic_address, city: raw.clinic_city, state: raw.clinic_state, contactNumber: raw.clinic_contact, timeZone: raw.time_zone }, doctor: raw.doctor_name ? { name: raw.doctor_name, specialization: raw.specialization } : null, appointment: timeToAppointment ? { scheduledAt: timeToAppointment, slotMinutes: raw.slot_minutes, status: raw.appointment_status } : null, arrivalInstructions: "Online registration does not confirm physical arrival. Please check in with the receptionist when you reach the clinic.", estimate });
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
    return res.status(204).end();
  } catch (error) { return next(error); }

}

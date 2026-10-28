import { randomBytes } from "node:crypto";
import { IsNull } from "typeorm";
import { AppDataSource } from "../config/data-source.js";
import { QueueSession } from "../entities/QueueSession.js";
import { Registration } from "../entities/Registration.js";
import { QueueEntry } from "../entities/QueueEntry.js";
import { Appointment } from "../entities/Appointment.js";
import { createAccess } from "../services/patient/access-links.js";
import { normalizeMobile } from "../services/patient/mobile.js";
import { addDays, clinicHoursForDate, dateInZone, hoursCloseToMinutes, isSlotOpen, loadPublicClinic, validDate, zonedTimeToUtc, OPEN_STATUSES } from "../services/patient/clinic-availability.js";
import { emitQueueChange } from "../sockets/socket-server.js";
import { notifyRegistrationConfirmation } from "../services/notifications/dispatch.js";
import { Subscription } from "../entities/Subscription.js";
import { hasSubscriptionAccess } from "../services/subscriptions/access-policy.js";

export async function createPatientRegistration(req, res, next) {
  const { clinicId, visitType } = req.body;
  const mobile = normalizeMobile(req.body.mobile);
  const idempotencyKey = req.get("idempotency-key");
  try {
    const previous = await AppDataSource.getRepository(Registration).findOneBy({ idempotencyKey });
    if (previous) return res.status(409).json({ error: "This registration was already submitted. Use the confirmation link from the first submission or recover access by mobile." });
    const clinicData = await loadPublicClinic(clinicId);
    if (!clinicData) return res.status(404).json({ error: "Clinic not found." });
    const { clinic, settings, doctors } = clinicData;
    const subscription = await AppDataSource.getRepository(Subscription).findOneBy({ clinicId });
    if (!hasSubscriptionAccess(subscription)) return res.status(402).json({ error: "Online registration is temporarily unavailable while this clinic renews its subscription. Please contact the clinic directly." });
    const doctor = req.body.doctorId ? doctors.find((item) => item.id === req.body.doctorId) : doctors.length === 1 ? doctors[0] : null;
    if (req.body.doctorId && !doctor) return res.status(400).json({ error: "Choose an available doctor." });
    if (visitType === "appointment" && !doctor) return res.status(400).json({ error: "Choose a doctor for your appointment." });
    const date = visitType === "appointment" ? req.body.appointmentDate : dateInZone(new Date(), clinic.timeZone || "Asia/Kolkata");
    if (visitType === "appointment") {
      if (!settings?.appointmentCapacity || !settings.slotDurationMinutes) return res.status(409).json({ error: "Online appointments are unavailable at this clinic." });
      const today = dateInZone(new Date(), clinic.timeZone || "Asia/Kolkata");
      if (date < today || date > addDays(today, 60)) return res.status(400).json({ error: "Appointments can be booked up to 60 days ahead." });
    } else if (!settings?.walkInsEnabled) return res.status(409).json({ error: "Online walk-in registration is unavailable at this clinic." });
    const scheduledAt = visitType === "appointment" ? zonedTimeToUtc(date, req.body.slotTime, clinic.timeZone || "Asia/Kolkata") : null;
    const doctorId = doctor?.id || null;
    const sessionLock = `queue:${clinicId}:${doctorId || "all"}:${date}`;
    const slotLock = `appointment:${clinicId}:${doctorId || "all"}:${scheduledAt?.toISOString() || "walk-in"}`;
    const created = await AppDataSource.transaction(async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [slotLock]);
      if (visitType === "appointment") {
        const refreshed = await manager.getRepository(Appointment).createQueryBuilder("a").where("a.clinic_id = :clinicId AND a.doctor_id = :doctorId AND a.scheduled_at = :scheduledAt AND a.status IN (:...statuses)", { clinicId, doctorId: doctor.id, scheduledAt, statuses: OPEN_STATUSES }).getCount();
        if (refreshed >= settings.appointmentCapacity) throw Object.assign(new Error("That appointment slot has just filled. Choose another time."), { status: 409 });
        if (scheduledAt <= new Date() || dateInZone(scheduledAt, clinic.timeZone || "Asia/Kolkata") !== date) throw Object.assign(new Error("That appointment time is invalid. Choose another slot."), { status: 400 });
        const dayHours = clinicHoursForDate(clinic, settings, doctor, date);
        const [slotHour, slotMinute] = req.body.slotTime.split(":").map(Number);
        const slotStart = slotHour * 60 + slotMinute;
        const dayOpen = dayHours?.open ? hoursCloseToMinutes(dayHours.open) : -1;
        if (!dayHours?.enabled || slotStart < dayOpen || (slotStart - dayOpen) % settings.slotDurationMinutes !== 0 || !isSlotOpen(req.body.slotTime, settings.slotDurationMinutes, dayHours, settings.breaks)) throw Object.assign(new Error("That time is outside clinic hours."), { status: 400 });
      }
      await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [sessionLock]);
      const patientRows = await manager.query(`INSERT INTO "patients" ("name", "mobile", "contact_consent", "consent_at") VALUES ($1, $2, true, now()) ON CONFLICT ("mobile") DO UPDATE SET "name" = EXCLUDED."name", "contact_consent" = true, "consent_at" = now(), "updated_at" = now() RETURNING "id"`, [req.body.name.trim(), mobile]);
      const patientId = patientRows[0].id;
      let session = await manager.getRepository(QueueSession).findOneBy({ clinicId, doctorId: doctorId || IsNull(), sessionDate: date });
      if (!session) session = await manager.getRepository(QueueSession).save(manager.getRepository(QueueSession).create({ clinicId, doctorId, sessionDate: date }));
      const tokenResult = await manager.getRepository(QueueEntry).createQueryBuilder("q").where("q.session_id = :sessionId", { sessionId: session.id }).select("MAX(q.token_number)", "max").getRawOne();
      const orderResult = await manager.getRepository(QueueEntry).createQueryBuilder("q").where("q.session_id = :sessionId", { sessionId: session.id }).select("MAX(q.queue_order)", "max").getRawOne();
      const reference = `QL${randomBytes(7).toString("hex").toUpperCase()}`;
      const registration = await manager.getRepository(Registration).save(manager.getRepository(Registration).create({
        reference, idempotencyKey, clinicId, doctorId, patientId,
        visitType, status: "registered", consentToContact: req.body.consentToContact === true || req.body.consentToContact === "true",
      }));
      const queueEntry = await manager.getRepository(QueueEntry).save(manager.getRepository(QueueEntry).create({
        registrationId: registration.id, sessionId: session.id, tokenNumber: Number(tokenResult.max || 0) + 1,
        queueOrder: Number(orderResult.max || 0) + 1000, status: "registered",
      }));
      if (visitType === "appointment") {
        await manager.getRepository(Appointment).save(manager.getRepository(Appointment).create({ registrationId: registration.id, clinicId, doctorId: doctor.id, patientId, scheduledAt, slotMinutes: settings.slotDurationMinutes, status: "booked" }));
      }
      const access = await createAccess(manager, registration.id);
      return { registration, queueEntry, access };
    });
    emitQueueChange({ clinicId, registrationId: created.registration.id, status: "registered", type: "registration:confirmed" });
    void notifyRegistrationConfirmation(created.registration.id).catch((error) => console.error("Registration notification failed:", error.message));
    return res.status(201).json({
      registration: { id: created.registration.id, reference: created.registration.reference, status: created.registration.status, visitType, tokenNumber: created.queueEntry.tokenNumber },
      clinic: { id: clinic.id, name: clinic.name, address: clinic.address, city: clinic.city, state: clinic.state, timeZone: clinic.timeZone },
      doctor: doctor ? { id: doctor.id, name: doctor.name, specialization: doctor.specialization } : null,
      appointment: scheduledAt ? { date, time: req.body.slotTime, timeZone: clinic.timeZone, scheduledAt: scheduledAt.toISOString() } : null,
      arrivalInstructions: "Your registration is confirmed. Please check in with the receptionist when you arrive; online registration does not confirm physical arrival.",
      accessUrl: created.access.url,
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.code === "23505") return res.status(409).json({ error: "This registration was already submitted. Recover access using your mobile number." });
    return next(error);
  }

}

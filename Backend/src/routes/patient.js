import { Router } from "express";
import { body, param, query, validationResult, header } from "express-validator";
import { createHmac, randomBytes, randomInt, randomUUID, createHash, timingSafeEqual } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { AppDataSource } from "../config/data-source.js";
import { Clinic } from "../entities/Clinic.js";
import { ClinicSettings } from "../entities/ClinicSettings.js";
import { Doctor } from "../entities/Doctor.js";
import { Patient } from "../entities/Patient.js";
import { QueueSession } from "../entities/QueueSession.js";
import { Registration } from "../entities/Registration.js";
import { QueueEntry } from "../entities/QueueEntry.js";
import { Appointment } from "../entities/Appointment.js";
import { PatientAccessToken } from "../entities/PatientAccessToken.js";
import { OtpChallenge } from "../entities/OtpChallenge.js";
import { IsNull } from "typeorm";

export const publicRouter = Router();
export const patientRouter = Router();

const registrationLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 12, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many registration attempts. Please try again shortly." } });
const recoveryLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many recovery attempts. Please wait before trying again." } });
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const OPEN_STATUSES = ["booked", "confirmed", "checked_in"];

function validationError(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });
  return next();
}

function normalizeMobile(value) { return value.replace(/[\s()-]/g, ""); }

function dateInZone(date, timeZone) {
  const fields = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date).map(({ type, value }) => [type, value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function addDays(date, amount) {
  const day = new Date(`${date}T00:00:00.000Z`);
  day.setUTCDate(day.getUTCDate() + amount);
  return day.toISOString().slice(0, 10);
}

function weekdayForDate(date) { return DAY_NAMES[new Date(`${date}T12:00:00.000Z`).getUTCDay()]; }

function zonedTimeToUtc(date, time, timeZone) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  let result = wanted;
  const formatter = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(result)).map(({ type, value }) => [type, value]));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    result += wanted - represented;
  }
  return new Date(result);
}

function clinicHoursForDate(clinic, settings, doctor, date) {
  const day = weekdayForDate(date);
  return doctor?.availability?.workingHours?.[day] || settings.workingHours?.[day] || null;
}

function isSlotOpen(time, duration, hours, breaks) {
  const [hour, minute] = time.split(":").map(Number);
  const start = hour * 60 + minute;
  const end = start + duration;
  if (end > hoursCloseToMinutes(hours.close)) return false;
  return !(breaks || []).some((pause) => {
    const pauseStart = hoursCloseToMinutes(pause.start);
    const pauseEnd = hoursCloseToMinutes(pause.end);
    return start < pauseEnd && end > pauseStart;
  });
}

function hoursCloseToMinutes(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function accessSecret() { return randomBytes(32).toString("base64url"); }
function accessHash(secret) { return createHash("sha256").update(secret).digest("hex"); }
function accessUrl(secret) { return `${process.env.APP_BASE_URL || "http://localhost:5173"}/patient/registration#${secret}`; }
function otpHash(challengeId, code) { return createHmac("sha256", process.env.OTP_SECRET || process.env.JWT_SECRET).update(`${challengeId}:${code}`).digest("hex"); }

async function createAccess(manager, registrationId) {
  const repository = manager.getRepository(PatientAccessToken);
  const secret = accessSecret();
  const now = new Date();
  await repository.createQueryBuilder().update(PatientAccessToken).set({ revokedAt: now }).where('"registration_id" = :registrationId AND "revoked_at" IS NULL', { registrationId }).execute();
  await repository.save(repository.create({ registrationId, tokenHash: accessHash(secret), expiresAt: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000) }));
  return { secret, url: accessUrl(secret) };
}

async function loadPublicClinic(clinicId) {
  const clinic = await AppDataSource.getRepository(Clinic).findOneBy({ id: clinicId, status: "active" });
  if (!clinic) return null;
  const [settings, doctors] = await Promise.all([
    AppDataSource.getRepository(ClinicSettings).findOneBy({ clinicId }),
    AppDataSource.getRepository(Doctor).find({ where: { clinicId, status: "active" }, select: { id: true, name: true, specialization: true, availability: true }, order: { createdAt: "ASC" } }),
  ]);
  return { clinic, settings, doctors };
}

async function availableSlots({ clinic, settings, doctor, date }) {
  if (!settings || !doctor || !settings.appointmentCapacity || !settings.slotDurationMinutes) return [];
  const dayHours = clinicHoursForDate(clinic, settings, doctor, date);
  if (!dayHours?.enabled) return [];
  const duration = settings.slotDurationMinutes;
  const open = hoursCloseToMinutes(dayHours.open);
  const close = hoursCloseToMinutes(dayHours.close);
  const clinicToday = dateInZone(new Date(), clinic.timeZone || "Asia/Kolkata");
  const now = Date.now();
  const dayStart = zonedTimeToUtc(date, "00:00", clinic.timeZone || "Asia/Kolkata");
  const dayEnd = zonedTimeToUtc(addDays(date, 1), "00:00", clinic.timeZone || "Asia/Kolkata");
  const booked = await AppDataSource.getRepository(Appointment).createQueryBuilder("a")
    .select("a.scheduled_at", "scheduled_at").addSelect("COUNT(*)", "count")
    .where("a.clinic_id = :clinicId AND a.doctor_id = :doctorId", { clinicId: clinic.id, doctorId: doctor.id })
    .andWhere("a.scheduled_at >= :dayStart AND a.scheduled_at < :dayEnd", { dayStart, dayEnd })
    .andWhere("a.status IN (:...statuses)", { statuses: OPEN_STATUSES })
    .groupBy("a.scheduled_at").getRawMany();
  const counts = new Map(booked.map((row) => [new Date(row.scheduled_at).toISOString(), Number(row.count)]));
  const slots = [];
  for (let start = open; start + duration <= close; start += duration) {
    const hhmm = `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
    if (!isSlotOpen(hhmm, duration, dayHours, settings.breaks)) continue;
    const startsAt = zonedTimeToUtc(date, hhmm, clinic.timeZone || "Asia/Kolkata");
    if (date === clinicToday && startsAt.getTime() <= now) continue;
    const bookedCount = counts.get(startsAt.toISOString()) || 0;
    if (bookedCount >= settings.appointmentCapacity) continue;
    slots.push({ time: hhmm, startsAt: startsAt.toISOString(), remaining: settings.appointmentCapacity - bookedCount });
  }
  return slots;
}

publicRouter.get("/clinics", [
  query("q").optional().trim().isLength({ max: 100 }), query("city").optional().trim().isLength({ max: 100 }), validationError,
], async (req, res, next) => {
  try {
    const builder = AppDataSource.getRepository(Clinic).createQueryBuilder("c")
      .innerJoin(Doctor, "d", "d.clinic_id = c.id AND d.status = 'active'")
      .where("c.status = 'active'")
      .select(["c.id AS id", "c.name AS name", "c.address AS address", "c.city AS city", "c.state AS state", "c.contact_number AS contact_number", "c.time_zone AS time_zone"])
      .distinct(true).orderBy("c.name", "ASC").limit(50);
    if (req.query.q) builder.andWhere("(c.name ILIKE :q OR c.city ILIKE :q OR c.address ILIKE :q)", { q: `%${req.query.q}%` });
    if (req.query.city) builder.andWhere("c.city ILIKE :city", { city: `%${req.query.city}%` });
    return res.json({ clinics: await builder.getRawMany() });
  } catch (error) { return next(error); }
});

publicRouter.get("/clinics/:clinicId", [param("clinicId").isUUID(), validationError], async (req, res, next) => {
  try {
    const result = await loadPublicClinic(req.params.clinicId);
    if (!result) return res.status(404).json({ error: "Clinic not found." });
    const { clinic, settings, doctors } = result;
    return res.json({ clinic: { id: clinic.id, name: clinic.name, address: clinic.address, city: clinic.city, state: clinic.state, contactNumber: clinic.contactNumber, timeZone: clinic.timeZone, workingHours: settings?.workingHours || {} }, doctors: doctors.map(({ id, name, specialization }) => ({ id, name, specialization })), appointmentBookingEnabled: Boolean(settings?.appointmentCapacity && settings?.slotDurationMinutes && doctors.length), walkInsEnabled: Boolean(settings?.walkInsEnabled) });
  } catch (error) { return next(error); }
});

publicRouter.get("/clinics/:clinicId/slots", [
  param("clinicId").isUUID(), query("date").custom(validDate).withMessage("Choose a valid appointment date."), query("doctorId").isUUID().withMessage("Choose a doctor."), validationError,
], async (req, res, next) => {
  try {
    const result = await loadPublicClinic(req.params.clinicId);
    if (!result) return res.status(404).json({ error: "Clinic not found." });
    const { clinic, settings, doctors } = result;
    const doctor = doctors.find((item) => item.id === req.query.doctorId);
    if (!doctor) return res.status(404).json({ error: "Doctor not found." });
    const today = dateInZone(new Date(), clinic.timeZone || "Asia/Kolkata");
    if (req.query.date < today || req.query.date > addDays(today, 60)) return res.json({ date: req.query.date, slots: [] });
    return res.json({ date: req.query.date, durationMinutes: settings?.slotDurationMinutes || 0, capacity: settings?.appointmentCapacity || 0, slots: await availableSlots({ clinic, settings, doctor, date: req.query.date }) });
  } catch (error) { return next(error); }
});

publicRouter.post("/registrations", registrationLimiter, [
  body("clinicId").isUUID(), body("doctorId").optional({ values: "falsy" }).isUUID(),
  body("name").trim().isLength({ min: 2, max: 160 }).withMessage("Enter your name."),
  body("mobile").trim().matches(/^\+?[0-9\s()-]{8,20}$/).withMessage("Enter a valid mobile number."),
  body("visitType").isIn(["appointment", "walk_in"]),
  body("appointmentDate").if(body("visitType").equals("appointment")).custom(validDate),
  body("slotTime").if(body("visitType").equals("appointment")).matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body("consentToContact").equals("true").withMessage("Consent to receive registration updates is required."),
  header("idempotency-key").isUUID().withMessage("Retry-safe request key is required."),
  validationError,
], async (req, res, next) => {
  const { clinicId, visitType } = req.body;
  const mobile = normalizeMobile(req.body.mobile);
  const idempotencyKey = req.get("idempotency-key");
  try {
    const previous = await AppDataSource.getRepository(Registration).findOneBy({ idempotencyKey });
    if (previous) return res.status(409).json({ error: "This registration was already submitted. Use the confirmation link from the first submission or recover access by mobile." });
    const clinicData = await loadPublicClinic(clinicId);
    if (!clinicData) return res.status(404).json({ error: "Clinic not found." });
    const { clinic, settings, doctors } = clinicData;
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
      const reference = `QL${randomBytes(7).toString("hex").toUpperCase()}`;
      const registration = await manager.getRepository(Registration).save(manager.getRepository(Registration).create({
        reference, idempotencyKey, clinicId, doctorId, patientId,
        visitType, status: "registered",
      }));
      const queueEntry = await manager.getRepository(QueueEntry).save(manager.getRepository(QueueEntry).create({
        registrationId: registration.id, sessionId: session.id, tokenNumber: Number(tokenResult.max || 0) + 1,
        status: "registered",
      }));
      if (visitType === "appointment") {
        await manager.getRepository(Appointment).save(manager.getRepository(Appointment).create({ registrationId: registration.id, clinicId, doctorId: doctor.id, patientId, scheduledAt, slotMinutes: settings.slotDurationMinutes, status: "booked" }));
      }
      const access = await createAccess(manager, registration.id);
      return { registration, queueEntry, access };
    });
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
});

async function requirePatientAccess(req, res, next) {
  const secret = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || secret.length < 40 || secret.length > 100) return res.status(401).json({ error: "A valid private registration link is required." });
  try {
    const access = await AppDataSource.getRepository(PatientAccessToken).createQueryBuilder("t").where("t.token_hash = :tokenHash AND t.revoked_at IS NULL", { tokenHash: accessHash(secret) }).getOne();
    if (!access || access.expiresAt <= new Date()) return res.status(401).json({ error: "This private link has expired or was revoked. Recover access using your mobile number." });
    access.lastAccessedAt = new Date();
    await AppDataSource.getRepository(PatientAccessToken).save(access);
    req.patientAccess = { tokenId: access.id, registrationId: access.registrationId };
    return next();
  } catch (error) { return next(error); }
}

patientRouter.get("/registration", requirePatientAccess, async (req, res, next) => {
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
      const before = await AppDataSource.getRepository(QueueEntry).createQueryBuilder("q").where("q.session_id = :sessionId AND q.status = 'waiting' AND q.token_number < :tokenNumber", { sessionId: raw.session_id, tokenNumber: raw.token_number }).getCount();
      position = before + 1;
    }
    const settings = await AppDataSource.getRepository(ClinicSettings).findOneBy({ clinicId: raw.clinic_id });
    const timeToAppointment = raw.scheduled_at ? new Date(raw.scheduled_at).toISOString() : null;
    return res.json({ registration: { reference: raw.reference, status: raw.status, visitType: raw.visit_type, tokenNumber: raw.token_number, queueStatus: raw.queue_status, queuePosition: position, createdAt: raw.created_at }, patient: { name: raw.patient_name }, clinic: { id: raw.clinic_id, name: raw.clinic_name, address: raw.clinic_address, city: raw.clinic_city, state: raw.clinic_state, contactNumber: raw.clinic_contact, timeZone: raw.time_zone }, doctor: raw.doctor_name ? { name: raw.doctor_name, specialization: raw.specialization } : null, appointment: timeToAppointment ? { scheduledAt: timeToAppointment, slotMinutes: raw.slot_minutes, status: raw.appointment_status } : null, arrivalInstructions: "Online registration does not confirm physical arrival. Please check in with the receptionist when you reach the clinic.", estimate: position ? { minimumMinutes: (position - 1) * (settings?.slotDurationMinutes || 15), maximumMinutes: position * (settings?.slotDurationMinutes || 15) + 10, disclaimer: "This is an estimate and may change; it is not a guaranteed consultation time." } : null });
  } catch (error) { return next(error); }
});

patientRouter.post("/access/rotate", requirePatientAccess, async (req, res, next) => {
  try {
    const result = await AppDataSource.transaction((manager) => createAccess(manager, req.patientAccess.registrationId));
    return res.json({ accessUrl: result.url });
  } catch (error) { return next(error); }
});

patientRouter.delete("/access", requirePatientAccess, async (req, res, next) => {
  try {
    await AppDataSource.getRepository(PatientAccessToken).update({ id: req.patientAccess.tokenId }, { revokedAt: new Date() });
    return res.status(204).end();
  } catch (error) { return next(error); }
});

patientRouter.post("/recovery/request", recoveryLimiter, [body("mobile").trim().matches(/^\+?[0-9\s()-]{8,20}$/), validationError], async (req, res, next) => {
  const mobile = normalizeMobile(req.body.mobile);
  try {
    const patient = await AppDataSource.getRepository(Patient).findOneBy({ mobile });
    let developmentCode;
    if (patient) {
      const code = String(randomInt(100000, 1000000));
      const id = randomUUID();
      const challenge = AppDataSource.getRepository(OtpChallenge).create({ id, mobile, challengeHash: otpHash(id, code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
      await AppDataSource.getRepository(OtpChallenge).save(challenge);
      if (process.env.NODE_ENV !== "production" && process.env.OTP_DEV_ECHO === "true") developmentCode = code;
    }
    return res.status(202).json({ message: "If registrations exist for that mobile number, a verification code has been sent.", ...(developmentCode ? { developmentCode } : {}) });
  } catch (error) { return next(error); }
});

patientRouter.post("/recovery/verify", recoveryLimiter, [
  body("mobile").trim().matches(/^\+?[0-9\s()-]{8,20}$/), body("code").isLength({ min: 6, max: 6 }).isNumeric(), validationError,
], async (req, res, next) => {
  const mobile = normalizeMobile(req.body.mobile);
  try {
    const result = await AppDataSource.transaction(async (manager) => {
      const challenge = await manager.getRepository(OtpChallenge).createQueryBuilder("o").where("o.mobile = :mobile AND o.consumed_at IS NULL AND o.expires_at > now()", { mobile }).orderBy("o.created_at", "DESC").setLock("pessimistic_write").getOne();
      if (!challenge || challenge.attemptCount >= 5) return { error: true };
      challenge.attemptCount += 1;
      const expected = Buffer.from(challenge.challengeHash);
      const provided = Buffer.from(otpHash(challenge.id, req.body.code));
      if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
        await manager.getRepository(OtpChallenge).save(challenge);
        return { error: true };
      }
      challenge.verifiedAt = new Date();
      challenge.consumedAt = new Date();
      await manager.getRepository(OtpChallenge).save(challenge);
      const registrations = await manager.getRepository(Registration).createQueryBuilder("r")
        .innerJoin("patients", "p", "p.id = r.patient_id").where("p.mobile = :mobile AND r.status NOT IN ('cancelled', 'rescheduled')", { mobile })
        .orderBy("r.created_at", "DESC").limit(20).getMany();
      const links = [];
      for (const registration of registrations) {
        const clinic = await manager.getRepository(Clinic).findOneBy({ id: registration.clinicId });
        const access = await createAccess(manager, registration.id);
        links.push({ reference: registration.reference, clinicName: clinic?.name || "Clinic", accessUrl: access.url });
      }
      return { links };
    });
    if (result.error) return res.status(400).json({ error: "The code is invalid or expired." });
    return res.json({ registrations: result.links });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import { randomBytes } from "node:crypto";
import { IsNull } from "typeorm";
import { AppDataSource } from "../config/data-source.js";
import { requireAuth } from "../middleware/require-auth.js";
import { Clinic } from "../entities/Clinic.js";
import { ClinicSettings } from "../entities/ClinicSettings.js";
import { Doctor } from "../entities/Doctor.js";
import { Patient } from "../entities/Patient.js";
import { QueueSession } from "../entities/QueueSession.js";
import { Registration } from "../entities/Registration.js";
import { QueueEntry } from "../entities/QueueEntry.js";
import { AuditLog } from "../entities/AuditLog.js";
import { Appointment } from "../entities/Appointment.js";

export const clinicRouter = Router();
clinicRouter.use(requireAuth);

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DEFAULT_HOURS = Object.fromEntries(DAYS.map((day, index) => [day, { enabled: index < 6, open: "09:00", close: "17:00" }]));
const ACTIVE_QUEUE_STATUSES = ["registered", "waiting", "called", "in_consultation"];

function validationError(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });
  return next();
}

function clinicToday(timeZone = "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function clockInZone(date, timeZone) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

function weekdayInZone(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(date).toLowerCase();
}

function clinicIsOpen(settings, now = new Date()) {
  const timeZone = settings.clinic?.timeZone || "Asia/Kolkata";
  const today = settings.workingHours?.[weekdayInZone(now, timeZone)];
  if (!today?.enabled) return false;
  const time = clockInZone(now, timeZone);
  if (time < today.open || time >= today.close) return false;
  return !(settings.breaks || []).some((item) => item.start && item.end && time >= item.start && time < item.end);
}

async function getSettings(manager, clinicId) {
  await manager.query(`INSERT INTO "clinic_settings" ("clinic_id") VALUES ($1) ON CONFLICT ("clinic_id") DO NOTHING`, [clinicId]);
  const repository = manager.getRepository(ClinicSettings);
  const settings = await repository.findOneBy({ clinicId });
  if (!Object.keys(settings.workingHours || {}).length) {
    settings.workingHours = DEFAULT_HOURS;
    return repository.save(settings);
  }
  return settings;
}

function cleanSettings(input) {
  return {
    workingHours: input.workingHours,
    breaks: input.breaks || [],
    slotDurationMinutes: input.slotDurationMinutes,
    appointmentCapacity: input.appointmentCapacity,
    walkInsEnabled: input.walkInsEnabled,
    notifyAtPatientsAhead: input.notifyAtPatientsAhead,
    missedTurnPolicy: input.missedTurnPolicy || "after_waiting",
    returnPatientsAhead: input.returnPatientsAhead ?? 5,
  };
}

clinicRouter.get("/setup", async (req, res, next) => {
  try {
    const [clinic, settings, doctors] = await Promise.all([
      AppDataSource.getRepository(Clinic).findOneBy({ id: req.auth.clinicId }),
      getSettings(AppDataSource.manager, req.auth.clinicId),
      AppDataSource.getRepository(Doctor).find({ where: { clinicId: req.auth.clinicId, status: "active" }, order: { createdAt: "ASC" } }),
    ]);
    return res.json({ clinic, settings, doctors, setupComplete: doctors.length > 0 && DAYS.some((day) => settings.workingHours?.[day]?.enabled) });
  } catch (error) { return next(error); }
});

clinicRouter.put("/profile", [
  body("name").optional().trim().isLength({ min: 2, max: 160 }),
  body("address").optional().trim().isLength({ min: 5, max: 1000 }),
  body("city").optional().trim().isLength({ min: 2, max: 100 }),
  body("state").optional().trim().isLength({ min: 2, max: 100 }),
  body("contactNumber").optional().trim().matches(/^\+?[0-9\s()-]{8,20}$/),
  body("timeZone").optional().isString().isLength({ min: 1, max: 64 }).bail().custom((value) => { try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return true; } catch { return false; } }),
  validationError,
], async (req, res, next) => {
  try {
    const allowed = Object.fromEntries(["name", "address", "city", "state", "contactNumber", "timeZone"].filter((key) => req.body[key] !== undefined).map((key) => [key, key === "contactNumber" ? req.body[key].replace(/[\s()-]/g, "") : req.body[key]]));
    await AppDataSource.getRepository(Clinic).update({ id: req.auth.clinicId }, allowed);
    const clinic = await AppDataSource.getRepository(Clinic).findOneBy({ id: req.auth.clinicId });
    return res.json({ clinic });
  } catch (error) { return next(error); }
});

clinicRouter.put("/settings", [
  body("workingHours").isObject().withMessage("Working hours are required."),
  body("workingHours.*.enabled").isBoolean(),
  body("workingHours.*.open").matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body("workingHours.*.close").matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body("breaks").optional().isArray({ max: 6 }),
  body("breaks.*.start").optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body("breaks.*.end").optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body("slotDurationMinutes").isInt({ min: 5, max: 120 }),
  body("appointmentCapacity").isInt({ min: 1, max: 100 }),
  body("walkInsEnabled").isBoolean(),
  body("notifyAtPatientsAhead").isInt({ min: 1, max: 30 }),
  body("missedTurnPolicy").optional().isIn(["after_waiting", "at_end"]),
  body("returnPatientsAhead").optional().isInt({ min: 0, max: 30 }),
  validationError,
], async (req, res, next) => {
  try {
    const hours = req.body.workingHours;
    if (DAYS.some((day) => !hours[day] || hours[day].open >= hours[day].close)) return res.status(400).json({ error: "Provide valid opening and closing times for every day." });
    if ((req.body.breaks || []).some((item) => !item.start || !item.end || item.start >= item.end)) return res.status(400).json({ error: "Break end time must be later than its start time." });
    const repository = AppDataSource.getRepository(ClinicSettings);
    const existing = await getSettings(AppDataSource.manager, req.auth.clinicId);
    Object.assign(existing, cleanSettings(req.body));
    return res.json({ settings: await repository.save(existing) });
  } catch (error) { return next(error); }
});

clinicRouter.get("/doctors", async (req, res, next) => {
  try {
    const doctors = await AppDataSource.getRepository(Doctor).find({ where: { clinicId: req.auth.clinicId, status: "active" }, order: { createdAt: "ASC" } });
    return res.json({ doctors });
  } catch (error) { return next(error); }
});

clinicRouter.post("/doctors", [
  body("name").trim().isLength({ min: 2, max: 160 }).withMessage("Doctor name is required."),
  body("specialization").optional({ values: "falsy" }).trim().isLength({ max: 120 }),
  body("details").optional({ values: "falsy" }).trim().isLength({ max: 2000 }),
  body("availability").optional().isObject(),
  validationError,
], async (req, res, next) => {
  try {
    const doctor = await AppDataSource.getRepository(Doctor).save(AppDataSource.getRepository(Doctor).create({ clinicId: req.auth.clinicId, name: req.body.name, specialization: req.body.specialization || null, details: req.body.details || null, availability: req.body.availability || {} }));
    return res.status(201).json({ doctor });
  } catch (error) { return next(error); }
});

clinicRouter.put("/doctors/:doctorId", [
  param("doctorId").isUUID(), body("name").optional().trim().isLength({ min: 2, max: 160 }),
  body("specialization").optional({ values: "falsy" }).trim().isLength({ max: 120 }),
  body("details").optional({ values: "falsy" }).trim().isLength({ max: 2000 }), body("availability").optional().isObject(), validationError,
], async (req, res, next) => {
  try {
    const repository = AppDataSource.getRepository(Doctor);
    const doctor = await repository.findOneBy({ id: req.params.doctorId, clinicId: req.auth.clinicId, status: "active" });
    if (!doctor) return res.status(404).json({ error: "Doctor not found." });
    for (const field of ["name", "specialization", "details", "availability"]) if (req.body[field] !== undefined) doctor[field] = req.body[field] || null;
    return res.json({ doctor: await repository.save(doctor) });
  } catch (error) { return next(error); }
});

clinicRouter.delete("/doctors/:doctorId", [param("doctorId").isUUID(), validationError], async (req, res, next) => {
  try {
    const result = await AppDataSource.getRepository(Doctor).update({ id: req.params.doctorId, clinicId: req.auth.clinicId, status: "active" }, { status: "inactive" });
    if (!result.affected) return res.status(404).json({ error: "Doctor not found." });
    return res.status(204).end();
  } catch (error) { return next(error); }
});

clinicRouter.get("/dashboard", async (req, res, next) => {
  try {
    const clinic = await AppDataSource.getRepository(Clinic).findOneBy({ id: req.auth.clinicId });
    const day = clinicToday(clinic.timeZone);
    const queue = await AppDataSource.getRepository(QueueEntry).createQueryBuilder("q")
      .innerJoin("registrations", "r", "r.id = q.registration_id")
      .innerJoin("patients", "p", "p.id = r.patient_id")
      .leftJoin("doctors", "d", "d.id = r.doctor_id")
      .innerJoin("queue_sessions", "s", "s.id = q.session_id")
      .where("r.clinic_id = :clinicId AND s.session_date = :day", { clinicId: req.auth.clinicId, day })
      .select(["q.id AS queue_id", "q.token_number AS token_number", "q.status AS queue_status", "q.created_at AS registered_at", "r.id AS registration_id", "r.reference AS reference", "r.status AS status", "r.visit_type AS visit_type", "p.name AS patient_name", "p.mobile AS patient_mobile", "d.name AS doctor_name"])
      .orderBy("q.token_number", "ASC").getRawMany();
    const all = await AppDataSource.getRepository(Registration).createQueryBuilder("r")
      .where("r.clinic_id = :clinicId", { clinicId: req.auth.clinicId })
      .andWhere("(r.created_at AT TIME ZONE :timeZone)::date = :day", { timeZone: clinic.timeZone, day })
      .select("r.status", "status").addSelect("COUNT(*)", "count").groupBy("r.status").getRawMany();
    const totals = Object.fromEntries(all.map((row) => [row.status, Number(row.count)]));
    const visibleQueue = queue.filter((entry) => ACTIVE_QUEUE_STATUSES.includes(entry.queue_status));
    let position = 0;
    const positionedQueue = visibleQueue.map((entry) => {
      if (entry.queue_status === "waiting") position += 1;
      return { ...entry, position: entry.queue_status === "waiting" ? position : null };
    });
    const waiting = queue.filter((entry) => entry.queue_status === "waiting").length;
    const registrationCount = Object.values(totals).reduce((total, count) => total + count, 0);
    return res.json({ date: day, summary: { registrations: registrationCount, waiting, consulting: totals.in_consultation || 0, completed: totals.completed || 0, missed: totals.missed || 0, cancelled: totals.cancelled || 0 }, queue: positionedQueue });
  } catch (error) { return next(error); }
});

clinicRouter.post("/walk-ins", [
  body("name").trim().isLength({ min: 2, max: 160 }).withMessage("Patient name is required."),
  body("mobile").trim().matches(/^\+?[0-9\s()-]{8,20}$/).withMessage("Enter a valid mobile number."),
  body("doctorId").optional({ values: "falsy" }).isUUID(), body("notes").optional({ values: "falsy" }).trim().isLength({ max: 500 }),
  validationError,
], async (req, res, next) => {
  const clinicId = req.auth.clinicId;
  const doctorId = req.body.doctorId || null;
  const mobile = req.body.mobile.replace(/[\s()-]/g, "");
  const day = await AppDataSource.getRepository(Clinic).findOneBy({ id: clinicId }).then((clinic) => clinicToday(clinic.timeZone));
  const lockKey = `queue:${clinicId}:${doctorId || "all"}:${day}`;
  try {
    const result = await AppDataSource.transaction(async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [lockKey]);
      const settings = await getSettings(manager, clinicId);
      const clinic = await manager.getRepository(Clinic).findOneBy({ id: clinicId });
      settings.clinic = clinic;
      if (!settings.walkInsEnabled) throw Object.assign(new Error("Walk-in registration is disabled for this clinic."), { status: 409 });
      if (!clinicIsOpen(settings)) throw Object.assign(new Error("The clinic is currently outside its configured working hours."), { status: 409 });
      if (doctorId) {
        const doctor = await manager.getRepository(Doctor).findOneBy({ id: doctorId, clinicId, status: "active" });
        if (!doctor) throw Object.assign(new Error("Selected doctor is unavailable."), { status: 400 });
      }
      let session = await manager.getRepository(QueueSession).findOneBy({ clinicId, doctorId: doctorId || IsNull(), sessionDate: day });
      if (!session) session = await manager.getRepository(QueueSession).save(manager.getRepository(QueueSession).create({ clinicId, doctorId, sessionDate: day }));
      const maxToken = await manager.getRepository(QueueEntry).createQueryBuilder("q").where("q.session_id = :sessionId", { sessionId: session.id }).select("MAX(q.token_number)", "max").getRawOne();
      const tokenNumber = Number(maxToken.max || 0) + 1;
      const patientRows = await manager.query(`INSERT INTO "patients" ("name", "mobile") VALUES ($1, $2) ON CONFLICT ("mobile") DO UPDATE SET "name" = EXCLUDED."name", "updated_at" = now() RETURNING "id"`, [req.body.name.trim(), mobile]);
      const reference = `QL${randomBytes(7).toString("hex").toUpperCase()}`;
      const registration = await manager.getRepository(Registration).save(manager.getRepository(Registration).create({ reference, clinicId, doctorId, patientId: patientRows[0].id, visitType: "walk_in", notes: req.body.notes?.trim() || null, status: "waiting" }));
      const queueEntry = await manager.getRepository(QueueEntry).save(manager.getRepository(QueueEntry).create({ registrationId: registration.id, sessionId: session.id, tokenNumber, status: "waiting", checkedInAt: new Date() }));
      await manager.getRepository(AuditLog).save(manager.getRepository(AuditLog).create({ clinicId, actorId: req.auth.sub, action: "walk_in_registered", entityType: "registration", entityId: registration.id, metadata: { tokenNumber } }));
      return { registration, queueEntry, tokenNumber };
    });
    return res.status(201).json({ registration: { id: result.registration.id, reference: result.registration.reference, status: result.registration.status, tokenNumber: result.tokenNumber, visitType: result.registration.visitType, createdAt: result.registration.createdAt }, message: "Walk-in registered and added to today's queue." });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

clinicRouter.post("/queue/call-next", [body("doctorId").optional({ values: "falsy" }).isUUID(), validationError], async (req, res, next) => {
  const clinicId = req.auth.clinicId;
  const doctorId = req.body.doctorId || null;
  try {
    const called = await AppDataSource.transaction(async (manager) => {
      const clinic = await manager.getRepository(Clinic).findOneBy({ id: clinicId });
      const day = clinicToday(clinic.timeZone);
      await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`queue:${clinicId}:${doctorId || "all"}:${day}`]);
      const query = manager.getRepository(QueueEntry).createQueryBuilder("q")
        .innerJoin("registrations", "r", "r.id = q.registration_id")
        .innerJoin("queue_sessions", "s", "s.id = q.session_id")
        .where("r.clinic_id = :clinicId AND s.session_date = :day AND q.status = 'waiting'", { clinicId, day })
        .select(["q.id AS id", "q.registration_id AS registration_id", "q.token_number AS token_number"])
        .orderBy("q.token_number", "ASC").limit(1).setLock("pessimistic_write", undefined, ["q"]);
      if (doctorId) query.andWhere("r.doctor_id = :doctorId", { doctorId });
      const entry = await query.getRawOne();
      if (!entry) return null;
      await manager.getRepository(QueueEntry).update({ id: entry.id, status: "waiting" }, { status: "called", calledAt: new Date() });
      await manager.getRepository(Registration).update({ id: entry.registration_id, clinicId, status: "waiting" }, { status: "called" });
      await manager.getRepository(AuditLog).save(manager.getRepository(AuditLog).create({ clinicId, actorId: req.auth.sub, action: "patient_called", entityType: "queue_entry", entityId: entry.id, metadata: { tokenNumber: entry.token_number, method: "call_next" } }));
      return { id: entry.id, tokenNumber: entry.token_number, status: "called" };
    });
    if (!called) return res.status(409).json({ error: "There are no waiting patients in this queue." });
    return res.json({ queueEntry: called });
  } catch (error) { return next(error); }
});

clinicRouter.post("/queue/:queueId/:action", [param("queueId").isUUID(), param("action").isIn(["check-in", "call", "start", "complete", "miss", "cancel"]), validationError], async (req, res, next) => {
  const transitions = {
    "check-in": { from: "registered", to: "waiting", queueTo: "waiting", action: "patient_checked_in" },
    call: { from: "waiting", to: "called", queueTo: "called", action: "patient_called" },
    start: { from: "called", to: "in_consultation", queueTo: "in_consultation", action: "consultation_started" },
    complete: { from: "in_consultation", to: "completed", queueTo: "completed", action: "consultation_completed" },
    miss: { from: "called", to: "missed", queueTo: "missed", action: "patient_missed" },
    cancel: { from: ["waiting", "called"], to: "cancelled", queueTo: "cancelled", action: "registration_cancelled" },
  };
  const transition = transitions[req.params.action];
  try {
    const changed = await AppDataSource.transaction(async (manager) => {
      const entry = await manager.getRepository(QueueEntry).createQueryBuilder("q").innerJoin("registrations", "r", "r.id = q.registration_id")
        .where("q.id = :id AND r.clinic_id = :clinicId", { id: req.params.queueId, clinicId: req.auth.clinicId })
        .select(["q.id AS id", "q.registration_id AS registration_id", "q.session_id AS session_id", "q.token_number AS token_number", "q.status AS status"])
        .setLock("pessimistic_write", undefined, ["q"]).getRawOne();
      if (!entry) throw Object.assign(new Error("Queue entry not found."), { status: 404 });
      const allowed = Array.isArray(transition.from) ? transition.from : [transition.from];
      if (!allowed.includes(entry.status)) throw Object.assign(new Error(`Cannot ${req.params.action} a patient whose status is ${entry.status}.`), { status: 409 });
      if (req.params.action === "check-in") {
        const clinic = await manager.getRepository(Clinic).findOneBy({ id: req.auth.clinicId });
        const session = await manager.getRepository(QueueSession).findOneBy({ id: entry.session_id });
        const sessionDate = session?.sessionDate instanceof Date ? session.sessionDate.toISOString().slice(0, 10) : String(session?.sessionDate || "").slice(0, 10);
        if (!session || sessionDate !== clinicToday(clinic.timeZone)) throw Object.assign(new Error("Only today's registrations can be checked in."), { status: 409 });
      }
      if (req.params.action === "start") {
        await manager.query(`SELECT "id" FROM "queue_sessions" WHERE "id" = $1 FOR UPDATE`, [entry.session_id]);
        const anotherConsultation = await manager.getRepository(QueueEntry).findOneBy({ sessionId: entry.session_id, status: "in_consultation" });
        if (anotherConsultation) throw Object.assign(new Error("Complete the current consultation before starting another patient."), { status: 409 });
      }
      await manager.getRepository(QueueEntry).update({ id: entry.id }, { status: transition.queueTo, ...(req.params.action === "check-in" ? { checkedInAt: new Date() } : {}), ...(req.params.action === "call" ? { calledAt: new Date() } : {}), ...(req.params.action === "start" ? { consultationStartedAt: new Date() } : {}), ...(req.params.action === "complete" ? { completedAt: new Date() } : {}) });
      await manager.getRepository(Registration).update({ id: entry.registration_id, clinicId: req.auth.clinicId }, { status: transition.to, ...(req.params.action === "complete" ? { completedAt: new Date() } : {}) });
      if (req.params.action === "check-in") await manager.getRepository(Appointment).update({ registrationId: entry.registration_id, status: "booked" }, { status: "checked_in" });
      await manager.getRepository(AuditLog).save(manager.getRepository(AuditLog).create({ clinicId: req.auth.clinicId, actorId: req.auth.sub, action: transition.action, entityType: "queue_entry", entityId: entry.id, metadata: { tokenNumber: entry.token_number } }));
      return { id: entry.id, tokenNumber: entry.token_number, status: transition.to };
    });
    return res.json({ queueEntry: changed });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

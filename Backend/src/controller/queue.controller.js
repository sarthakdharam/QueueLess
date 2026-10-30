import { AppDataSource } from "../config/data-source.js";
import { Clinic } from "../entities/Clinic.js";
import { QueueSession } from "../entities/QueueSession.js";
import { Registration } from "../entities/Registration.js";
import { QueueEntry } from "../entities/QueueEntry.js";
import { AuditLog } from "../entities/AuditLog.js";
import { Appointment } from "../entities/Appointment.js";
import { getSettings } from "../services/clinic/settings.js";
import { clinicToday } from "../services/clinic/time.js";
import { emitQueueChange } from "../sockets/socket-server.js";
import { ReturnEvent } from "../entities/ReturnEvent.js";
import { calculateReturnPlacement } from "../services/queue/return-policy.js";
import { notifyApproachingPatients } from "../services/notifications/dispatch.js";
import { transitionFor } from "../services/queue/transitions.js";

export async function callNextPatient(req, res, next) {
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
        .leftJoin("appointments", "a", "a.registration_id = r.id")
        .where("r.clinic_id = :clinicId AND s.session_date = :day AND q.status = 'waiting'", { clinicId, day })
      .select(["q.id AS id", "q.registration_id AS registration_id", "q.session_id AS session_id", "q.token_number AS token_number"])
        .orderBy("CASE WHEN a.status IN ('booked', 'checked_in') AND a.scheduled_at <= now() THEN 0 WHEN a.scheduled_at IS NULL OR a.status = 'returned' THEN 1 ELSE 2 END", "ASC")
        .addOrderBy("a.scheduled_at", "ASC", "NULLS LAST").addOrderBy("q.queue_order", "ASC").limit(1).setLock("pessimistic_write", undefined, ["q"]);
      if (doctorId) query.andWhere("r.doctor_id = :doctorId", { doctorId });
      const entry = await query.getRawOne();
      if (!entry) return null;
      await manager.getRepository(QueueEntry).update({ id: entry.id, status: "waiting" }, { status: "called", calledAt: new Date() });
      await manager.getRepository(Registration).update({ id: entry.registration_id, clinicId, status: "waiting" }, { status: "called" });
      await manager.getRepository(AuditLog).save(manager.getRepository(AuditLog).create({ clinicId, actorId: req.auth.sub, action: "patient_called", entityType: "queue_entry", entityId: entry.id, metadata: { tokenNumber: entry.token_number, method: "call_next" } }));
      return { id: entry.id, registrationId: entry.registration_id, sessionId: entry.session_id, tokenNumber: entry.token_number, status: "called" };
    });
    if (!called) return res.status(409).json({ error: "There are no waiting patients in this queue." });
    emitQueueChange({ clinicId, registrationId: called.registrationId, status: "called" });
  void notifyApproachingPatients(clinicId, called.sessionId).catch((error) => console.error("Turn reminder failed:", process.env.NODE_ENV === "production" ? error.name : error.message));
    return res.json({ queueEntry: called });
  } catch (error) { return next(error); }

}

export async function transitionQueueEntry(req, res, next) {
  if (req.params.action === "return" && req.body.overrideReturnRule) {
    if (req.auth.role !== "administrator") return res.status(403).json({ error: "Only a clinic administrator can override the return queue rule." });
    if (!req.body.overrideReason || req.body.overrideReason.trim().length < 5) return res.status(400).json({ error: "Enter a reason of at least five characters for this override." });
    if (!Number.isInteger(Number(req.body.patientsAhead)) || Number(req.body.patientsAhead) < 0 || Number(req.body.patientsAhead) > 30) return res.status(400).json({ error: "Choose a valid number of eligible waiting patients to place ahead." });
  }
  try {
    const changed = await AppDataSource.transaction(async (manager) => {
      const entry = await manager.getRepository(QueueEntry).createQueryBuilder("q").innerJoin("registrations", "r", "r.id = q.registration_id")
        .where("q.id = :id AND r.clinic_id = :clinicId", { id: req.params.queueId, clinicId: req.auth.clinicId })
        .select(["q.id AS id", "q.registration_id AS registration_id", "q.session_id AS session_id", "q.token_number AS token_number", "q.status AS status"])
        .setLock("pessimistic_write", undefined, ["q"]).getRawOne();
      if (!entry) throw Object.assign(new Error("Queue entry not found."), { status: 404 });
      const transition = transitionFor(req.params.action, entry.status);
      if (!transition) throw Object.assign(new Error(`Cannot ${req.params.action} a patient whose status is ${entry.status}.`), { status: 409 });
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
      if (req.params.action === "return") {
        await manager.query(`SELECT "id" FROM "queue_sessions" WHERE "id" = $1 FOR UPDATE`, [entry.session_id]);
        const settings = await getSettings(manager, req.auth.clinicId);
        const waiting = await manager.getRepository(QueueEntry).createQueryBuilder("q")
          .innerJoin("registrations", "r", "r.id = q.registration_id")
          .leftJoin("appointments", "a", "a.registration_id = r.id")
          .where("q.session_id = :sessionId AND q.status = 'waiting'", { sessionId: entry.session_id })
          .select(["q.id AS id", "q.queue_order AS queue_order"])
          .orderBy("CASE WHEN a.status IN ('booked', 'checked_in') AND a.scheduled_at <= now() THEN 0 WHEN a.scheduled_at IS NULL OR a.status = 'returned' THEN 1 ELSE 2 END", "ASC")
          .addOrderBy("a.scheduled_at", "ASC", "NULLS LAST").addOrderBy("q.queue_order", "ASC").getRawMany();
        const override = req.body.overrideReturnRule ? { patientsAhead: Math.min(Number(req.body.patientsAhead ?? 0), waiting.length) } : null;
        const placement = calculateReturnPlacement(waiting, settings.missedTurnPolicy, settings.returnPatientsAhead, override);
        for (const queued of placement.shifted) {
          await manager.getRepository(QueueEntry).update({ id: queued.id }, { queueOrder: queued.queueOrder });
        }
        await manager.getRepository(QueueEntry).update({ id: entry.id }, { queueOrder: placement.queueOrder });
        const appliedPolicy = req.body.overrideReturnRule ? "staff_override" : settings.missedTurnPolicy;
        await manager.getRepository(ReturnEvent).save(manager.getRepository(ReturnEvent).create({ registrationId: entry.registration_id, queueEntryId: entry.id, actorId: req.auth.sub, appliedPolicy, patientsAhead: placement.patientsAhead, assignedOrder: placement.queueOrder, overrideReason: req.body.overrideReturnRule ? req.body.overrideReason.trim() : null }));
        await manager.getRepository(AuditLog).save(manager.getRepository(AuditLog).create({ clinicId: req.auth.clinicId, actorId: req.auth.sub, action: "return_queue_rule_applied", entityType: "queue_entry", entityId: entry.id, metadata: { appliedPolicy, patientsAhead: placement.patientsAhead, overrideReason: req.body.overrideReturnRule ? req.body.overrideReason.trim() : null } }));
      }
      await manager.getRepository(QueueEntry).update({ id: entry.id }, { status: transition.queueTo, ...(req.params.action === "check-in" ? { checkedInAt: new Date() } : {}), ...(req.params.action === "call" ? { calledAt: new Date() } : {}), ...(req.params.action === "start" ? { consultationStartedAt: new Date() } : {}), ...(req.params.action === "complete" ? { completedAt: new Date() } : {}) });
      await manager.getRepository(Registration).update({ id: entry.registration_id, clinicId: req.auth.clinicId }, { status: transition.to, ...(req.params.action === "complete" ? { completedAt: new Date() } : {}) });
      if (req.params.action === "check-in") await manager.getRepository(Appointment).update({ registrationId: entry.registration_id, status: "booked" }, { status: "checked_in" });
      if (req.params.action === "miss") await manager.getRepository(Appointment).update({ registrationId: entry.registration_id, status: "checked_in" }, { status: "missed" });
      if (req.params.action === "return") await manager.getRepository(Appointment).update({ registrationId: entry.registration_id, status: "missed" }, { status: "returned" });
      await manager.getRepository(AuditLog).save(manager.getRepository(AuditLog).create({ clinicId: req.auth.clinicId, actorId: req.auth.sub, action: transition.action, entityType: "queue_entry", entityId: entry.id, metadata: { tokenNumber: entry.token_number } }));
      return { id: entry.id, registrationId: entry.registration_id, sessionId: entry.session_id, tokenNumber: entry.token_number, status: transition.to };
    });
    emitQueueChange({ clinicId: req.auth.clinicId, registrationId: changed.registrationId, status: changed.status });
    void notifyApproachingPatients(req.auth.clinicId, changed.sessionId).catch((error) => console.error("Turn reminder failed:", process.env.NODE_ENV === "production" ? error.name : error.message));
    return res.json({ queueEntry: changed });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }

}

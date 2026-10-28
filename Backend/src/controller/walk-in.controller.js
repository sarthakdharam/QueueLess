import { randomBytes } from "node:crypto";
import { IsNull } from "typeorm";
import { AppDataSource } from "../config/data-source.js";
import { Clinic } from "../entities/Clinic.js";
import { Doctor } from "../entities/Doctor.js";
import { QueueSession } from "../entities/QueueSession.js";
import { Registration } from "../entities/Registration.js";
import { QueueEntry } from "../entities/QueueEntry.js";
import { AuditLog } from "../entities/AuditLog.js";
import { getSettings } from "../services/clinic/settings.js";
import { clinicIsOpen, clinicToday } from "../services/clinic/time.js";
import { emitQueueChange } from "../sockets/socket-server.js";
import { notifyApproachingPatients } from "../services/notifications/dispatch.js";

export async function registerWalkIn(req, res, next) {
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
      const maxOrder = await manager.getRepository(QueueEntry).createQueryBuilder("q").where("q.session_id = :sessionId", { sessionId: session.id }).select("MAX(q.queue_order)", "max").getRawOne();
      const tokenNumber = Number(maxToken.max || 0) + 1;
      const patientRows = await manager.query(`INSERT INTO "patients" ("name", "mobile") VALUES ($1, $2) ON CONFLICT ("mobile") DO UPDATE SET "name" = EXCLUDED."name", "updated_at" = now() RETURNING "id"`, [req.body.name.trim(), mobile]);
      const reference = `QL${randomBytes(7).toString("hex").toUpperCase()}`;
      const registration = await manager.getRepository(Registration).save(manager.getRepository(Registration).create({ reference, clinicId, doctorId, patientId: patientRows[0].id, visitType: "walk_in", notes: req.body.notes?.trim() || null, status: "waiting" }));
      const queueEntry = await manager.getRepository(QueueEntry).save(manager.getRepository(QueueEntry).create({ registrationId: registration.id, sessionId: session.id, tokenNumber, queueOrder: Number(maxOrder.max || 0) + 1000, status: "waiting", checkedInAt: new Date() }));
      await manager.getRepository(AuditLog).save(manager.getRepository(AuditLog).create({ clinicId, actorId: req.auth.sub, action: "walk_in_registered", entityType: "registration", entityId: registration.id, metadata: { tokenNumber } }));
      return { registration, queueEntry, tokenNumber, sessionId: session.id };
    });
    emitQueueChange({ clinicId, registrationId: result.registration.id, status: "waiting" });
    void notifyApproachingPatients(clinicId, result.sessionId).catch((error) => console.error("Turn reminder failed:", error.message));
    return res.status(201).json({ registration: { id: result.registration.id, reference: result.registration.reference, status: result.registration.status, tokenNumber: result.tokenNumber, visitType: result.registration.visitType, createdAt: result.registration.createdAt }, message: "Walk-in registered and added to today's queue." });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }

}

import { listClinicNotifications, simulateNotification } from "../services/notifications/dispatch.js";
import { AppDataSource } from "../config/data-source.js";

export async function getUnreadNotificationCount(req, res, next) {
  try {
    const rows = await AppDataSource.query(`SELECT count(*)::int AS count FROM "notifications" WHERE "clinic_id" = $1 AND "read_at" IS NULL`, [req.auth.clinicId]);
    return res.json({ count: rows[0]?.count || 0 });
  } catch (error) { return next(error); }
}

export async function markClinicNotificationsRead(req, res, next) {
  try {
    await AppDataSource.query(`UPDATE "notifications" SET "read_at" = now() WHERE "clinic_id" = $1 AND "read_at" IS NULL`, [req.auth.clinicId]);
    return res.json({ success: true });
  } catch (error) { return next(error); }
}

export async function getClinicNotifications(req, res, next) {
  try {
    return res.json({ notifications: await listClinicNotifications(req.auth.clinicId, { unreadOnly: req.query.unread === "true" }) });
  } catch (error) { return next(error); }
}

export async function createNotificationSimulation(req, res, next) {
  try {
    const notification = await simulateNotification({ clinicId: req.auth.clinicId, actorId: req.auth.sub, outcome: req.body.outcome });
    return res.status(201).json({ notification });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message, ...(error.notification ? { notification: error.notification } : {}) });
    return next(error);
  }
}

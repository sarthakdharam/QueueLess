import { listClinicNotifications, simulateNotification } from "../services/notifications/dispatch.js";

export async function getClinicNotifications(req, res, next) {
  try {
    return res.json({ notifications: await listClinicNotifications(req.auth.clinicId) });
  } catch (error) { return next(error); }
}

export async function createNotificationSimulation(req, res, next) {
  try {
    const notification = await simulateNotification({ clinicId: req.auth.clinicId, actorId: req.auth.sub, outcome: req.body.outcome });
    return res.status(201).json({ notification });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
}

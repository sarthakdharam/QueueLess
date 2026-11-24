import {
  countUnreadClinicNotifications,
  listClinicNotifications,
  markClinicNotificationsRead as markRead,
} from "../services/notifications/clinic-notifications.js";
import { simulateNotification } from "../services/notifications/dispatch.js";

export async function getUnreadNotificationCount(req, res, next) {
  try {
    const count = await countUnreadClinicNotifications(req.auth.clinicId);
    return res.json({ count });
  } catch (error) {
    return next(error);
  }
}

export async function markClinicNotificationsRead(req, res, next) {
  try {
    await markRead(req.auth.clinicId);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
}

export async function getClinicNotifications(req, res, next) {
  try {
    return res.json({
      notifications: await listClinicNotifications(req.auth.clinicId, {
        unreadOnly: req.query.unread === "true",
      }),
    });
  } catch (error) {
    return next(error);
  }
}

export async function createNotificationSimulation(req, res, next) {
  try {
    const notification = await simulateNotification({
      clinicId: req.auth.clinicId,
      actorId: req.auth.sub,
      outcome: req.body.outcome,
    });
    return res.status(201).json({ notification });
  } catch (error) {
    if (error.status)
      return res
        .status(error.status)
        .json({
          error: error.message,
          ...(error.notification ? { notification: error.notification } : {}),
        });
    return next(error);
  }
}

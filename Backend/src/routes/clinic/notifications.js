import { Router } from "express";
import { body } from "express-validator";
import { validateRequest } from "../../middleware/validate-request.js";
import { createNotificationSimulation, getClinicNotifications, getUnreadNotificationCount, markClinicNotificationsRead } from "../../controller/notification.controller.js";

const router = Router();
router.get("/notifications/unread-count", getUnreadNotificationCount);
router.post("/notifications/read", markClinicNotificationsRead);
router.get("/notifications", getClinicNotifications);
router.post("/notifications/simulate", [body("outcome").isIn(["success", "failure"]), validateRequest], createNotificationSimulation);
export default router;

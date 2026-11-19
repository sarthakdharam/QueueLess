import { Router } from "express";
import { requirePatientAccess } from "../../middleware/patient-access.js";
import {
  getPatientRegistration,
  rotatePatientAccess,
  revokePatientAccess,
  updateNotificationPreference,
  getRescheduleOptions,
  reschedulePatientAppointment,
  submitAppointmentFeedback,
} from "../../controller/patient-registration.controller.js";
import { body } from "express-validator";
import { validateRequest } from "../../middleware/validate-request.js";

const router = Router();

router.get("/registration", requirePatientAccess, getPatientRegistration);

router.post("/access/rotate", requirePatientAccess, rotatePatientAccess);

router.delete("/access", requirePatientAccess, revokePatientAccess);
router.put(
  "/notifications/preferences",
  requirePatientAccess,
  [body("enabled").isBoolean(), validateRequest],
  updateNotificationPreference,
);
router.get("/reschedule/options", requirePatientAccess, getRescheduleOptions);
router.post(
  "/reschedule",
  requirePatientAccess,
  [
    body("date").matches(/^\d{4}-\d{2}-\d{2}$/),
    body("slotTime").matches(/^([01]\d|2[0-3]):[0-5]\d$/),
    body("expectedScheduledAt").isISO8601({ strict: true }),
    validateRequest,
  ],
  reschedulePatientAppointment,
);
router.post(
  "/feedback",
  requirePatientAccess,
  [
    body("rating").isInt({ min: 1, max: 5 }),
    body("categories").optional().isArray({ max: 5 }),
    body("categories.*").optional().isString().trim().isLength({ max: 60 }),
    body("comment").optional().isString().trim().isLength({ max: 1000 }),
    validateRequest,
  ],
  submitAppointmentFeedback,
);

export default router;

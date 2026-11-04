import { Router } from "express";
import { requirePatientAccess } from "../../middleware/patient-access.js";
import { getPatientRegistration, rotatePatientAccess, revokePatientAccess, updateNotificationPreference, getRescheduleOptions, reschedulePatientAppointment } from "../../controller/patient-registration.controller.js";
import { body } from "express-validator";
import { validateRequest } from "../../middleware/validate-request.js";

const router = Router();

router.get("/registration", requirePatientAccess, getPatientRegistration);

router.post("/access/rotate", requirePatientAccess, rotatePatientAccess);

router.delete("/access", requirePatientAccess, revokePatientAccess);
router.put("/notifications/preferences", requirePatientAccess, [body("enabled").isBoolean(), validateRequest], updateNotificationPreference);
router.get("/reschedule/options", requirePatientAccess, getRescheduleOptions);
router.post("/reschedule", requirePatientAccess, [body("date").matches(/^\d{4}-\d{2}-\d{2}$/), body("slotTime").matches(/^([01]\d|2[0-3]):[0-5]\d$/), validateRequest], reschedulePatientAppointment);

export default router;

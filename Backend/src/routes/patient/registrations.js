import { Router } from "express";
import { requirePatientAccess } from "../../middleware/patient-access.js";
import { getPatientRegistration, rotatePatientAccess, revokePatientAccess, updateNotificationPreference } from "../../controller/patient-registration.controller.js";
import { body } from "express-validator";
import { validateRequest } from "../../middleware/validate-request.js";

const router = Router();

router.get("/registration", requirePatientAccess, getPatientRegistration);

router.post("/access/rotate", requirePatientAccess, rotatePatientAccess);

router.delete("/access", requirePatientAccess, revokePatientAccess);
router.put("/notifications/preferences", requirePatientAccess, [body("enabled").isBoolean(), validateRequest], updateNotificationPreference);

export default router;

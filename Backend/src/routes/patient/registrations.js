import { Router } from "express";
import { requirePatientAccess } from "../../middleware/patient-access.js";
import { getPatientRegistration, rotatePatientAccess, revokePatientAccess } from "../../controller/patient-registration.controller.js";

const router = Router();

router.get("/registration", requirePatientAccess, getPatientRegistration);

router.post("/access/rotate", requirePatientAccess, rotatePatientAccess);

router.delete("/access", requirePatientAccess, revokePatientAccess);

export default router;

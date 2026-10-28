import { Router } from "express";
import { body } from "express-validator";
import { validateRequest } from "../../middleware/validate-request.js";
import { recoveryLimiter } from "../../middleware/patient-rate-limits.js";
import { requestRecoveryCode, verifyRecoveryCode } from "../../controller/patient-recovery.controller.js";

const router = Router();

router.post("/recovery/request", recoveryLimiter, [body("mobile").trim().matches(/^\+?[0-9\s()-]{8,20}$/), validateRequest], requestRecoveryCode);

router.post("/recovery/verify", recoveryLimiter, [
  body("mobile").trim().matches(/^\+?[0-9\s()-]{8,20}$/), body("code").isLength({ min: 6, max: 6 }).isNumeric(), validateRequest,
], verifyRecoveryCode);
export default router;

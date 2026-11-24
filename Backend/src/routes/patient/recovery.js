import { Router } from "express";
import { body, param } from "express-validator";
import { validateRequest } from "../../middleware/validate-request.js";
import { recoveryLimiter } from "../../middleware/patient-rate-limits.js";
import {
  getMyAppointments,
  replaceAppointmentAccessLink,
  requestRecoveryCode,
  revokeMyAppointmentSession,
  verifyRecoveryCode,
} from "../../controller/patient-recovery.controller.js";
import { requirePatientLookup } from "../../middleware/patient-lookup.js";
import { lookupReadLimiter } from "../../middleware/patient-rate-limits.js";
import { isValidIndianMobile } from "../../utils/normalize-mobile.js";

const router = Router();

router.post(
  "/recovery/request",
  recoveryLimiter,
  [
    body("mobile")
      .trim()
      .custom(isValidIndianMobile)
      .withMessage("Enter a valid 10-digit Indian mobile number."),
    validateRequest,
  ],
  requestRecoveryCode,
);

router.post(
  "/recovery/verify",
  recoveryLimiter,
  [
    body("mobile")
      .trim()
      .custom(isValidIndianMobile)
      .withMessage("Enter a valid 10-digit Indian mobile number."),
    body("code").isLength({ min: 6, max: 6 }).isNumeric(),
    validateRequest,
  ],
  verifyRecoveryCode,
);

router.get(
  "/recovery/appointments",
  lookupReadLimiter,
  requirePatientLookup,
  getMyAppointments,
);
router.post(
  "/recovery/appointments/:reference/access",
  lookupReadLimiter,
  requirePatientLookup,
  [
    param("reference").matches(/^QL[A-F0-9]{14}$/i),
    body("purpose").optional().equals("feedback"),
    validateRequest,
  ],
  replaceAppointmentAccessLink,
);
router.delete(
  "/recovery/session",
  lookupReadLimiter,
  requirePatientLookup,
  revokeMyAppointmentSession,
);
export default router;

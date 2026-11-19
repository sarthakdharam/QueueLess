import { Router } from "express";
import { body } from "express-validator";
import { validateRequest } from "../../middleware/validate-request.js";
import { registerWalkIn } from "../../controller/walk-in.controller.js";
import { requireActiveSubscription } from "../../middleware/require-active-subscription.js";
import { isValidIndianMobile } from "../../utils/normalize-mobile.js";

const router = Router();

router.post(
  "/walk-ins",
  requireActiveSubscription,
  [
    body("name")
      .trim()
      .isLength({ min: 2, max: 160 })
      .withMessage("Patient name is required."),
    body("mobile")
      .trim()
      .custom(isValidIndianMobile)
      .withMessage("Enter a valid 10-digit Indian mobile number."),
    body("doctorId").optional({ values: "falsy" }).isUUID(),
    body("notes").optional({ values: "falsy" }).trim().isLength({ max: 500 }),
    validateRequest,
  ],
  registerWalkIn,
);

export default router;

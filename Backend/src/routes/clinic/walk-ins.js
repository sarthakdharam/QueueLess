import { Router } from "express";
import { body } from "express-validator";
import { validateRequest } from "../../middleware/validate-request.js";
import { registerWalkIn } from "../../controller/walk-in.controller.js";
import { requireActiveSubscription } from "../../middleware/require-active-subscription.js";

const router = Router();

router.post("/walk-ins", requireActiveSubscription, [
  body("name").trim().isLength({ min: 2, max: 160 }).withMessage("Patient name is required."),
  body("mobile").trim().matches(/^\+?[0-9\s()-]{8,20}$/).withMessage("Enter a valid mobile number."),
  body("doctorId").optional({ values: "falsy" }).isUUID(), body("notes").optional({ values: "falsy" }).trim().isLength({ max: 500 }),
  validateRequest,
], registerWalkIn);

export default router;

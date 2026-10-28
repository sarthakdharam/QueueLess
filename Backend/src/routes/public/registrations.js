import { Router } from "express";
import { body, header } from "express-validator";
import { validateRequest } from "../../middleware/validate-request.js";
import { registrationLimiter } from "../../middleware/patient-rate-limits.js";
import { validDate } from "../../services/patient/clinic-availability.js";
import { createPatientRegistration } from "../../controller/public-registration.controller.js";

const router = Router();

router.post("/registrations", registrationLimiter, [
  body("clinicId").isUUID(), body("doctorId").optional({ values: "falsy" }).isUUID(),
  body("name").trim().isLength({ min: 2, max: 160 }).withMessage("Enter your name."),
  body("mobile").trim().matches(/^\+?[0-9\s()-]{8,20}$/).withMessage("Enter a valid mobile number."),
  body("visitType").isIn(["appointment", "walk_in"]),
  body("appointmentDate").if(body("visitType").equals("appointment")).custom(validDate),
  body("slotTime").if(body("visitType").equals("appointment")).matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body("consentToContact").equals("true").withMessage("Consent to receive registration updates is required."),
  header("idempotency-key").isUUID().withMessage("Retry-safe request key is required."),
  validateRequest,
], createPatientRegistration);

export default router;

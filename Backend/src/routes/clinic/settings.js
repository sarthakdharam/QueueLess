import { Router } from "express";
import { body } from "express-validator";
import { validateRequest } from "../../middleware/validate-request.js";
import { getSetup, updateClinicProfile, updateClinicSettings } from "../../controller/clinic-settings.controller.js";

const router = Router();

router.get("/setup", getSetup);

router.put("/profile", [
  body("name").optional().trim().isLength({ min: 2, max: 160 }),
  body("address").optional().trim().isLength({ min: 5, max: 1000 }),
  body("city").optional().trim().isLength({ min: 2, max: 100 }),
  body("state").optional().trim().isLength({ min: 2, max: 100 }),
  body("contactNumber").optional().trim().matches(/^\+?[0-9\s()-]{8,20}$/),
  body("timeZone").optional().isString().isLength({ min: 1, max: 64 }).bail().custom((value) => { try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return true; } catch { return false; } }),
  validateRequest,
], updateClinicProfile);

router.put("/settings", [
  body("workingHours").isObject().withMessage("Working hours are required."),
  body("workingHours.*.enabled").isBoolean(),
  body("workingHours.*.open").matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body("workingHours.*.close").matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body("breaks").optional().isArray({ max: 6 }),
  body("breaks.*.start").optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body("breaks.*.end").optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body("slotDurationMinutes").isInt({ min: 5, max: 120 }),
  body("appointmentCapacity").isInt({ min: 1, max: 100 }),
  body("walkInsEnabled").isBoolean(),
  body("notifyAtPatientsAhead").isInt({ min: 1, max: 30 }),
  body("missedTurnPolicy").optional().isIn(["after_waiting", "at_end"]),
  body("returnPatientsAhead").optional().isInt({ min: 0, max: 30 }),
  validateRequest,
], updateClinicSettings);

export default router;

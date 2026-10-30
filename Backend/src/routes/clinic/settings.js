import { Router } from "express";
import { body } from "express-validator";
import { validateRequest } from "../../middleware/validate-request.js";
import { getSetup, updateClinicProfile, updateClinicSettings } from "../../controller/clinic-settings.controller.js";
import { INDIAN_REGIONS } from "../../utils/indian-regions.js";
import { isValidAppointmentCapacity } from "../../utils/queue-preferences.js";
import { DAYS } from "../../services/clinic/settings.js";

const router = Router();

router.get("/setup", getSetup);

router.put("/profile", [
  body("name").optional().trim().isLength({ min: 2, max: 160 }),
  body("address").optional().trim().isLength({ min: 5, max: 1000 }),
  body("city").optional().trim().isLength({ min: 2, max: 100 }),
  body("state").optional().trim().isIn([...INDIAN_REGIONS]).withMessage("Choose a valid Indian state or Union Territory."),
  body("contactNumber").optional().trim().matches(/^\+?[0-9\s()-]{8,20}$/),
  body("timeZone").optional().isString().isLength({ min: 1, max: 64 }).bail().custom((value) => { try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return true; } catch { return false; } }),
  validateRequest,
], updateClinicProfile);

router.put("/settings", [
  body("workingHours").isObject().withMessage("Working hours are required.").bail().custom((hours) => DAYS.every((day) => {
    const schedule = hours[day];
    if (!schedule || typeof schedule.enabled !== "boolean") return false;
    if (!schedule.enabled) return true;
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.open) && /^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.close) && schedule.open < schedule.close;
  })).withMessage("Provide valid opening and closing times for every open day."),
  body("breaks").optional().isArray({ max: 6 }),
  body("breaks.*.start").optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body("breaks.*.end").optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body("slotDurationMinutes").isInt({ min: 5, max: 120 }),
  body("appointmentCapacity").custom(isValidAppointmentCapacity).withMessage("Appointments per slot must be a positive whole number from 1 to 100.").bail().toInt(),
  body("walkInsEnabled").isBoolean(),
  body("notifyAtPatientsAhead").isInt({ min: 1, max: 30 }),
  body("missedTurnPolicy").optional().isIn(["after_waiting", "at_end"]),
  body("returnPatientsAhead").optional().isInt({ min: 0, max: 30 }),
  validateRequest,
], updateClinicSettings);

export default router;

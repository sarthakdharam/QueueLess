import { Router } from "express";
import { query } from "express-validator";
import { validateRequest } from "../../middleware/validate-request.js";
import { getPatientHistory, getTodaysPatients } from "../../controller/clinic-patients.controller.js";
import { validDate } from "../../services/patient/clinic-availability.js";

const router = Router();
const searchRule = query("q").optional().trim().isLength({ max: 100 }).withMessage("Search must be 100 characters or fewer.");
const statusRule = query("status").optional().isIn(["registered", "waiting", "called", "in_consultation", "completed", "missed", "cancelled", "returned"]);

router.get("/patients/today", [searchRule, statusRule, validateRequest], getTodaysPatients);
router.get("/patients/history", [
  searchRule, statusRule,
  query("from").optional().custom(validDate).withMessage("Enter a valid start date."),
  query("to").optional().custom(validDate).withMessage("Enter a valid end date."),
  query("to").custom((value, { req }) => !value || !req.query.from || req.query.from <= value).withMessage("End date must be the same as or later than the start date."),
  query("page").optional().isInt({ min: 1, max: 100000 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  validateRequest,
], getPatientHistory);

export default router;

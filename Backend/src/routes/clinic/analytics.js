import { Router } from "express";
import { query } from "express-validator";
import { getClinicAnalytics } from "../../controller/clinic-analytics.controller.js";
import { validateRequest } from "../../middleware/validate-request.js";
import { limitReportLoad } from "../../middleware/limit-report-load.js";

const router = Router();

router.get(
  "/analytics",
  [query("date").optional().isISO8601({ strict: true })],
  validateRequest,
  limitReportLoad(getClinicAnalytics),
);

export default router;

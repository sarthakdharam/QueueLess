import { Router } from "express";
import { query } from "express-validator";
import { validateRequest } from "../../middleware/validate-request.js";
import { getDashboard } from "../../controller/clinic-dashboard.controller.js";

const router = Router();

router.get("/dashboard", [query("date").optional().isISO8601({ strict: true })], validateRequest, getDashboard);

export default router;

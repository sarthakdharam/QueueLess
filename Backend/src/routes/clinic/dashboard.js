import { Router } from "express";
import { getDashboard } from "../../controller/clinic-dashboard.controller.js";

const router = Router();

router.get("/dashboard", getDashboard);

export default router;

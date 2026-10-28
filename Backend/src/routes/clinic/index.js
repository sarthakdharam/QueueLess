import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import settingsRoutes from "./settings.js";
import doctorRoutes from "./doctors.js";
import dashboardRoutes from "./dashboard.js";
import walkInRoutes from "./walk-ins.js";
import queueRoutes from "./queue.js";

const clinicRouter = Router();
clinicRouter.use(requireAuth);
clinicRouter.use(settingsRoutes);
clinicRouter.use(doctorRoutes);
clinicRouter.use(dashboardRoutes);
clinicRouter.use(walkInRoutes);
clinicRouter.use(queueRoutes);

export { clinicRouter };

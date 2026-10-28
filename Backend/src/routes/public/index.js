import { Router } from "express";
import clinicRoutes from "./clinics.js";
import registrationRoutes from "./registrations.js";

const publicRouter = Router();
publicRouter.use(clinicRoutes);
publicRouter.use(registrationRoutes);

export { publicRouter };

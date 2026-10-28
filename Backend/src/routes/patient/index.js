import { Router } from "express";
import registrationRoutes from "./registrations.js";
import recoveryRoutes from "./recovery.js";

const patientRouter = Router();
patientRouter.use(registrationRoutes);
patientRouter.use(recoveryRoutes);

export { patientRouter };

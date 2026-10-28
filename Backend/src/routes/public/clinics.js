import { Router } from "express";
import { param, query } from "express-validator";
import { validateRequest } from "../../middleware/validate-request.js";
import { validDate } from "../../services/patient/clinic-availability.js";
import { searchClinics, getClinicDetails, getAvailableSlots } from "../../controller/public-clinic.controller.js";

const router = Router();

router.get("/clinics", [
  query("q").optional().trim().isLength({ max: 100 }), query("city").optional().trim().isLength({ max: 100 }), validateRequest,
], searchClinics);

router.get("/clinics/:clinicId", [param("clinicId").isUUID(), validateRequest], getClinicDetails);

router.get("/clinics/:clinicId/slots", [
  param("clinicId").isUUID(), query("date").custom(validDate).withMessage("Choose a valid appointment date."), query("doctorId").isUUID().withMessage("Choose a doctor."), validateRequest,
], getAvailableSlots);

export default router;

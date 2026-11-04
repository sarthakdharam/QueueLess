import { Router } from "express";
import { body, param } from "express-validator";
import { validateRequest } from "../../middleware/validate-request.js";
import { createDoctorEmergency, getDoctorEmergencyBoard, resumeDoctorAvailability } from "../../controller/doctor-emergency.controller.js";

const router = Router();
router.get("/doctor-availability", getDoctorEmergencyBoard);
router.post("/doctors/:doctorId/emergencies", [
  param("doctorId").isUUID(), body("mode").isIn(["temporary", "full_day", "until_notice"]), body("startsAt").isISO8601(), body("endsAt").optional({ values: "falsy" }).isISO8601(), body("expectedReturnAt").optional({ values: "falsy" }).isISO8601(), body("note").optional({ values: "falsy" }).trim().isLength({ max: 500 }), validateRequest,
], createDoctorEmergency);
router.post("/doctor-availability/:eventId/resume", [param("eventId").isUUID(), validateRequest], resumeDoctorAvailability);
export default router;

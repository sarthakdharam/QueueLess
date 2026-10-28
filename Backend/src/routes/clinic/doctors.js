import { Router } from "express";
import { body, param } from "express-validator";
import { validateRequest } from "../../middleware/validate-request.js";
import { listDoctors, createDoctor, updateDoctor, deactivateDoctor } from "../../controller/doctor.controller.js";

const router = Router();

router.get("/doctors", listDoctors);

router.post("/doctors", [
  body("name").trim().isLength({ min: 2, max: 160 }).withMessage("Doctor name is required."),
  body("specialization").optional({ values: "falsy" }).trim().isLength({ max: 120 }),
  body("details").optional({ values: "falsy" }).trim().isLength({ max: 2000 }),
  body("availability").optional().isObject(),
  validateRequest,
], createDoctor);

router.put("/doctors/:doctorId", [
  param("doctorId").isUUID(), body("name").optional().trim().isLength({ min: 2, max: 160 }),
  body("specialization").optional({ values: "falsy" }).trim().isLength({ max: 120 }),
  body("details").optional({ values: "falsy" }).trim().isLength({ max: 2000 }), body("availability").optional().isObject(), validateRequest,
], updateDoctor);

router.delete("/doctors/:doctorId", [param("doctorId").isUUID(), validateRequest], deactivateDoctor);

export default router;

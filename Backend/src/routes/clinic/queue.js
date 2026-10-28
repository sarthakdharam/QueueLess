import { Router } from "express";
import { body, param } from "express-validator";
import { validateRequest } from "../../middleware/validate-request.js";
import { callNextPatient, transitionQueueEntry } from "../../controller/queue.controller.js";

const router = Router();

router.post("/queue/call-next", [body("doctorId").optional({ values: "falsy" }).isUUID(), validateRequest], callNextPatient);

router.post("/queue/:queueId/:action", [param("queueId").isUUID(), param("action").isIn(["check-in", "call", "start", "complete", "miss", "return", "cancel"]), body("overrideReturnRule").optional().isBoolean(), body("patientsAhead").optional().isInt({ min: 0, max: 30 }), body("overrideReason").optional().trim().isLength({ min: 5, max: 500 }), validateRequest], transitionQueueEntry);

export default router;

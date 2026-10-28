import { Router } from "express";
import { body } from "express-validator";
import { validateRequest } from "../../middleware/validate-request.js";
import { getBilling, simulatePayment, startCheckout } from "../../controller/billing.controller.js";

const router = Router();
router.get("/billing", getBilling);
router.post("/billing/checkout", startCheckout);
router.post("/billing/simulate", [body("paymentId").isUUID(), body("outcome").isIn(["success", "failure"]), validateRequest], simulatePayment);
export default router;

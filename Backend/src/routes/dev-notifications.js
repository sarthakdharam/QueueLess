import { Router } from "express";
import { body, matchedData, param, query } from "express-validator";
import { requireAuth } from "../middleware/require-auth.js";
import { validateRequest } from "../middleware/validate-request.js";
import { limitReportLoad } from "../middleware/limit-report-load.js";
import { mockInboxEnabled } from "../services/notifications/dispatch.js";
import { mockNotificationTypes } from "../services/notifications/mock-templates.js";
import {
  getMockMessage, listMockMessages, listMockPatients, testMockMessage, updateMockOutcome,
} from "../services/notifications/mock-inbox.js";

const router = Router();
router.use((req, res, next) => {
  if (!mockInboxEnabled()) return res.status(404).json({ error: "Mock inbox is unavailable." });
  res.set("Cache-Control", "no-store");
  return next();
});
router.use(requireAuth);
router.use((req, res, next) => req.auth.role === "administrator"
  ? next()
  : res.status(403).json({ error: "Clinic administrator access is required." }));

const types = Object.keys(mockNotificationTypes);
const statuses = ["pending", "simulated", "delivered_simulated", "failed"];
const patientId = (value) => value === "system" || /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
const listRules = [
  query("page").optional().isInt({ min: 1, max: 10000 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("type").optional().isIn(types),
  query("status").optional().isIn(statuses),
  query("q").optional().trim().isLength({ max: 100 }),
];
const notFound = (res) => res.status(404).json({ error: "No matching clinic notification or patient." });

router.get("/", [
  ...listRules, query("view").optional().isIn(["conversations"]),
  query("patientId").optional().custom(patientId), validateRequest,
], limitReportLoad(async (req, res) => res.json(await listMockMessages(req.auth.clinicId, matchedData(req)))));

router.get("/patients", [query("q").optional().trim().isLength({ max: 100 }), validateRequest],
  async (req, res) => res.json({ patients: await listMockPatients(req.auth.clinicId, matchedData(req).q) }));

router.get("/patient/:patientId", [
  param("patientId").custom(patientId), ...listRules, validateRequest,
], async (req, res) => res.json(await listMockMessages(req.auth.clinicId, {
  ...matchedData(req), patientId: req.params.patientId,
})));

router.get("/:id", [param("id").isUUID(), validateRequest], async (req, res) => {
  const message = await getMockMessage(req.auth.clinicId, req.params.id);
  return message ? res.json(message) : notFound(res);
});

router.post("/test", [
  body("patientId").isUUID(),
  body("type").isIn(types),
  body("outcome").isIn(["preview", "success", "failure"]),
  body("message").optional().isString().trim().isLength({ max: 1200 }),
  validateRequest,
], async (req, res) => {
  const message = await testMockMessage(req.auth.clinicId, req.body);
  return message ? res.status(req.body.outcome === "preview" ? 200 : 201).json(message) : notFound(res);
});

for (const [suffix, delivered] of [["simulate-delivery", true], ["simulate-failure", false]]) {
  router.post(`/:id/${suffix}`, [param("id").isUUID(), validateRequest], async (req, res) => {
    const message = await updateMockOutcome(req.auth.clinicId, req.params.id, delivered);
    return message ? res.json(message) : notFound(res);
  });
}

export default router;

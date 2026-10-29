import express from "express";
import { authRouter } from "./routes/auth.js";
import { clinicRouter } from "./routes/clinic/index.js";
import { patientRouter } from "./routes/patient/index.js";
import { publicRouter } from "./routes/public/index.js";
import { razorpayWebhook, receiveWhatsAppWebhook, verifyWhatsAppWebhook } from "./controller/billing.controller.js";

const app = express();
const allowedOrigins = new Set((process.env.FRONTEND_ORIGIN || "http://localhost:5173").split(",").map((origin) => origin.trim()).filter(Boolean));
if (process.env.NODE_ENV !== "production") {
  allowedOrigins.add("http://localhost:5173");
  allowedOrigins.add("http://127.0.0.1:5173");
}

app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && !allowedOrigins.has(origin)) return res.status(403).json({ error: "This web origin is not allowed." });
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return next();
});
app.post("/api/v1/webhooks/razorpay", express.raw({ type: "application/json", limit: "100kb" }), razorpayWebhook);
app.get("/api/v1/webhooks/whatsapp", verifyWhatsAppWebhook);
app.post("/api/v1/webhooks/whatsapp", express.raw({ type: "application/json", limit: "100kb" }), receiveWhatsAppWebhook);
app.use(express.json({ limit: "20kb" }));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/clinic", clinicRouter);
app.use("/api/v1/public", publicRouter);
app.use("/api/v1/patient", patientRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "QueueLess backend is running" });
});

app.use((error, req, res, next) => {
  console.error("Request failed:", process.env.NODE_ENV === "production" ? error.name : error.message);
  if (res.headersSent) return next(error);
  return res.status(500).json({ error: "An unexpected server error occurred." });
});

export default app;

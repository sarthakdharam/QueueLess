import express from "express";
import { authRouter } from "./routes/auth.js";
import { clinicRouter } from "./routes/clinic/index.js";
import { patientRouter } from "./routes/patient/index.js";
import { publicRouter } from "./routes/public/index.js";

const app = express();

app.use(express.json({ limit: "20kb" }));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/clinic", clinicRouter);
app.use("/api/v1/public", publicRouter);
app.use("/api/v1/patient", patientRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "QueueLess backend is running" });
});

app.use((error, req, res, next) => {
  console.error("Request failed:", error.message);
  if (res.headersSent) return next(error);
  return res.status(500).json({ error: "An unexpected server error occurred." });
});

export default app;


import express from "express";
import { AppDataSource } from "./config/data-source.js";
import { authRouter } from "./routes/auth.js";
import { clinicRouter } from "./routes/clinic.js";
import { patientRouter, publicRouter } from "./routes/patient.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "20kb" }));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/clinic", clinicRouter);
app.use("/api/v1/public", publicRouter);
app.use("/api/v1/patient", patientRouter);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "QueueLess backend is running",
  });
});

app.use((error, req, res, next) => {
  console.error("Request failed:", error.message);
  if (res.headersSent) return next(error);
  return res.status(500).json({ error: "An unexpected server error occurred." });
});

let server;
let isShuttingDown = false;

async function startServer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error("JWT_SECRET must be set to a random value with at least 32 characters.");
    process.exitCode = 1;
    return;
  }

  try {
    await AppDataSource.initialize();
    console.log("PostgreSQL connected successfully.");
  } catch (error) {
    console.error(
      "Failed to initialize database connection:",
      error.message,
    );

    process.exitCode = 1;
    return;
  }

  server = app.listen(PORT, "127.0.0.1", () => {
    console.log(`QueueLess backend running on port ${PORT}`);
  });
}

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} received. Shutting down QueueLess backend...`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  } catch (error) {
    console.error(`Graceful shutdown failed (${error.name}).`);
    process.exitCode = 1;
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

await startServer();

import { AppDataSource } from "./config/data-source.js";
import app from "./app.js";
import { createServer } from "node:http";
import { once } from "node:events";
import { initializeSocketServer } from "./sockets/socket-server.js";
import { retryFailedNotifications } from "./services/notifications/dispatch.js";
import {
  reconcileAppointmentsOutsideClinicHours,
  recoverOverdueAppointments,
} from "./services/appointments/no-show-recovery.js";

const PORT = process.env.PORT || 3000;
let server;
let isShuttingDown = false;
let notificationWorker;
let noShowWorker;

function runNoShowRecovery() {
  void (async () => {
    await reconcileAppointmentsOutsideClinicHours();
    await recoverOverdueAppointments();
  })().catch((error) =>
    console.error(
      "Appointment recovery failed:",
      process.env.NODE_ENV === "production" ? error.name : error.message,
    ),
  );
}

async function startServer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error(
      "JWT_SECRET must be set to a random value with at least 32 characters.",
    );
    process.exitCode = 1;
    return;
  }

  try {
    await AppDataSource.initialize();
    const [{ exists }] = await AppDataSource.query(
      "SELECT to_regclass('migrations') IS NOT NULL AS exists",
    );
    if (!exists || (await AppDataSource.showMigrations())) {
      throw new Error("Pending database migrations. Run npm run migration:run from Backend.");
    }
    console.log("PostgreSQL connected successfully.");
  } catch (error) {
    console.error(
      "Failed to initialize database connection:",
      process.env.NODE_ENV === "production" ? error.name : error.message,
    );
    if (process.env.NODE_ENV !== "production" && error.code === "28P01") {
      console.error(
        "Check that POSTGRES_USER exists on the configured PostgreSQL server and that POSTGRES_PASSWORD in .env matches that role.",
      );
    }
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
    process.exitCode = 1;
    return;
  }

  server = createServer(app);
  try {
    const listening = once(server, "listening");
    server.listen(PORT, "127.0.0.1");
    await listening;
  } catch (error) {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the existing backend before starting another instance.`,
      );
    } else {
      console.error(
        "Failed to start the backend:",
        process.env.NODE_ENV === "production" ? error.name : error.message,
      );
    }
    server = undefined;
    await AppDataSource.destroy();
    process.exitCode = 1;
    return;
  }

  initializeSocketServer(server);
  notificationWorker = setInterval(() => {
    void retryFailedNotifications().catch((error) =>
      console.error(
        "Notification retry worker failed:",
        process.env.NODE_ENV === "production" ? error.name : error.message,
      ),
    );
  }, 30000);
  runNoShowRecovery();
  noShowWorker = setInterval(runNoShowRecovery, 5 * 60 * 1000);
  console.log(`QueueLess backend running on port ${PORT}`);
}

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received. Shutting down QueueLess backend...`);
  if (notificationWorker) clearInterval(notificationWorker);
  if (noShowWorker) clearInterval(noShowWorker);

  try {
    if (server)
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  } catch (error) {
    console.error(`Graceful shutdown failed (${error.name}).`);
    process.exitCode = 1;
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

await startServer();

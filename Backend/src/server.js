import { AppDataSource } from "./config/data-source.js";
import app from "./app.js";
import { createServer } from "node:http";
import { initializeSocketServer } from "./sockets/socket-server.js";
import { retryFailedNotifications } from "./services/notifications/dispatch.js";

const PORT = process.env.PORT || 3000;
let server;
let isShuttingDown = false;
let notificationWorker;

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
    console.error("Failed to initialize database connection:", error.message);
    process.exitCode = 1;
    return;
  }

  server = createServer(app);
  initializeSocketServer(server);
  notificationWorker = setInterval(() => { void retryFailedNotifications().catch((error) => console.error("Notification retry worker failed:", error.message)); }, 30000);
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`QueueLess backend running on port ${PORT}`);
  });
}

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received. Shutting down QueueLess backend...`);
  if (notificationWorker) clearInterval(notificationWorker);

  try {
    if (server) await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  } catch (error) {
    console.error(`Graceful shutdown failed (${error.name}).`);
    process.exitCode = 1;
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

await startServer();


import { AppDataSource } from "./data-source.js";

try {
  await AppDataSource.initialize();

  console.log("✅ PostgreSQL connected successfully!");

  const result = await AppDataSource.query(
    "SELECT current_database() AS database, current_user AS username, version() AS version"
  );

  console.log(result[0]);
} catch (error) {
  console.error("❌ Database connection failed:", error.message);
  process.exitCode = 1;
} finally {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
}

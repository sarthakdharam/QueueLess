import bcrypt from "bcryptjs";
import { AppDataSource } from "../config/data-source.js";
import { Clinic } from "../entities/Clinic.js";
import { ClinicUser } from "../entities/ClinicUser.js";
import { ClinicSettings } from "../entities/ClinicSettings.js";
import { Doctor } from "../entities/Doctor.js";
import { Subscription } from "../entities/Subscription.js";
import { getSettings } from "../services/clinic/settings.js";

if (process.env.NODE_ENV === "production") throw new Error("Demo seed data is disabled in production.");
if (!process.env.DEMO_SEED_PASSWORD || process.env.DEMO_SEED_PASSWORD.length < 12) throw new Error("Set DEMO_SEED_PASSWORD to a private password of at least 12 characters.");

await AppDataSource.initialize();
try {
  const email = "demo-admin@queueless.local";
  let clinic = await AppDataSource.getRepository(Clinic).findOneBy({ email });
  if (!clinic) clinic = await AppDataSource.getRepository(Clinic).save(AppDataSource.getRepository(Clinic).create({ name: "QueueLess Demo Clinic", address: "12 Clinic Road", city: "Pune", state: "Maharashtra", contactNumber: "+912067890123", email, timeZone: "Asia/Kolkata" }));
  const users = AppDataSource.getRepository(ClinicUser);
  if (!await users.findOneBy({ email })) await users.save(users.create({ clinicId: clinic.id, name: "Demo Administrator", email, passwordHash: await bcrypt.hash(process.env.DEMO_SEED_PASSWORD, 12), role: "administrator" }));
  const subscriptions = AppDataSource.getRepository(Subscription);
  if (!await subscriptions.findOneBy({ clinicId: clinic.id })) { const start = new Date(); const end = new Date(start); end.setMonth(end.getMonth() + 1); await subscriptions.save(subscriptions.create({ clinicId: clinic.id, status: "trial", plan: "base", trialStart: start, trialEnd: end })); }
  await getSettings(AppDataSource.manager, clinic.id);
  const doctors = AppDataSource.getRepository(Doctor);
  if (!await doctors.findOneBy({ clinicId: clinic.id })) await doctors.save(doctors.create({ clinicId: clinic.id, name: "Dr. Asha Mehta", specialization: "General Medicine" }));
  console.log(`Demo clinic ready. Sign in with ${email} and DEMO_SEED_PASSWORD.`);
} finally {
  await AppDataSource.destroy();
}

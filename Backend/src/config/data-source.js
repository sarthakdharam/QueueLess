
import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Clinic } from "../entities/Clinic.js";
import { ClinicUser } from "../entities/ClinicUser.js";
import { Subscription } from "../entities/Subscription.js";
import { InitialFoundation1760000000000 } from "../migrations/1760000000000-InitialFoundation.js";
import { ClinicOperations1760000001000 } from "../migrations/1760000001000-ClinicOperations.js";
import { ClinicSettings } from "../entities/ClinicSettings.js";
import { Doctor } from "../entities/Doctor.js";
import { Patient } from "../entities/Patient.js";
import { QueueSession } from "../entities/QueueSession.js";
import { Registration } from "../entities/Registration.js";
import { QueueEntry } from "../entities/QueueEntry.js";
import { AuditLog } from "../entities/AuditLog.js";
import { Appointment } from "../entities/Appointment.js";
import { PatientAccessToken } from "../entities/PatientAccessToken.js";
import { OtpChallenge } from "../entities/OtpChallenge.js";
import { PatientPortal1760000002000 } from "../migrations/1760000002000-PatientPortal.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

dotenv.config({
  path: path.resolve(currentDirectory, "../../../.env"),
});

const databaseHost = process.env.DB_HOST || "localhost";
const databasePort = Number(process.env.DB_PORT || 5432);

export const AppDataSource = new DataSource({
  type: "postgres",
  host: databaseHost,
  port: databasePort,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [Clinic, ClinicUser, Subscription, ClinicSettings, Doctor, Patient, QueueSession, Registration, QueueEntry, AuditLog, Appointment, PatientAccessToken, OtpChallenge],
  migrations: [InitialFoundation1760000000000, ClinicOperations1760000001000, PatientPortal1760000002000],
  synchronize: false,
  logging: false,
});

import { AppDataSource } from "../../config/data-source.js";
import { IsNull } from "typeorm";
import { Notification } from "../../entities/Notification.js";
import { sendSimulatedMessage } from "./providers/simulator.js";
import { sendWhatsAppTemplate } from "./providers/whatsapp-cloud.js";
import { approachingPatients } from "./notification-policy.js";
import { mobileLookupCandidates } from "../patient/mobile-lookup.js";

export async function dispatchNotification({ clinicId, registrationId = null, type, idempotencyKey, recipient, templateName, variables = [], recordVariables = variables, simulateFailure, forceSimulator = false }, adapters = {}) {
  const repository = AppDataSource.getRepository(Notification);
  const configuredMode = process.env.NOTIFICATION_PROVIDER || (process.env.NODE_ENV === "production" ? "disabled" : "simulator");
  const useSimulator = forceSimulator || configuredMode === "simulator";
  const channel = useSimulator ? "simulator" : configuredMode === "whatsapp" ? "whatsapp" : "disabled";
  let record;
  try {
    record = await repository.save(repository.create({ clinicId, registrationId, type, idempotencyKey, channel, deliveryStatus: "pending", payload: { templateName, variables: recordVariables } }));
  } catch (error) {
    if (error.code !== "23505") throw error;
    return repository.findOneBy({ idempotencyKey });
  }

  try {
    if (!useSimulator && configuredMode !== "whatsapp") throw new Error("No supported notification provider is explicitly configured.");
    if (useSimulator && process.env.NODE_ENV === "production") throw new Error("The development notification simulator is disabled in production.");
    const result = useSimulator
      ? await (adapters.sendSimulator || sendSimulatedMessage)({ templateName, variables, simulateFailure })
      : await (adapters.sendWhatsApp || sendWhatsAppTemplate)({ recipient, templateName, variables });
    record.deliveryStatus = useSimulator ? "simulated" : "sent";
    record.providerReference = result.providerReference;
  } catch (error) {
    record.deliveryStatus = "failed";
    record.failureReason = type === "otp_recovery" ? "Recovery code delivery failed." : type === "simulator_preview" ? "The development simulator failed to deliver the test message." : "Message delivery failed.";
  }
  return repository.save(record);
}

export async function notifyRegistrationConfirmation(registrationId, accessUrl) {
  const registration = await AppDataSource.query(
    `SELECT r.id, r.clinic_id, r.reference, r.consent_to_contact, r.visit_type, p.mobile,
            c.name AS clinic_name, c.time_zone, d.name AS doctor_name, a.scheduled_at, q.token_number
       FROM registrations r JOIN patients p ON p.id = r.patient_id JOIN clinics c ON c.id = r.clinic_id
       LEFT JOIN doctors d ON d.id = r.doctor_id LEFT JOIN appointments a ON a.registration_id = r.id
       LEFT JOIN queue_entries q ON q.registration_id = r.id WHERE r.id = $1`, [registrationId],
  ).then((rows) => rows[0]);
  if (!registration?.consent_to_contact || !accessUrl) return null;
  const zone = registration.time_zone || "Asia/Kolkata";
  const scheduled = registration.scheduled_at ? new Date(registration.scheduled_at) : null;
  const date = scheduled ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: zone }).format(scheduled) : "Walk-in registration";
  const time = scheduled ? new Intl.DateTimeFormat("en-IN", { timeStyle: "short", timeZone: zone }).format(scheduled) : "Check with reception";
  const variables = [registration.clinic_name, registration.doctor_name || "Any available doctor", date, time, String(registration.token_number), accessUrl];
  const recordVariables = [...variables.slice(0, -1), "[PRIVATE_LINK_REDACTED]"];
  return dispatchNotification({ clinicId: registration.clinic_id, registrationId, type: "registration_confirmation", idempotencyKey: `registration:${registrationId}:confirmation:v1`, recipient: registration.mobile, templateName: process.env.WHATSAPP_CONFIRMATION_TEMPLATE || "queueless_registration_confirmation", variables, recordVariables });
}

export async function sendRecoveryOtp({ mobile, challengeId, code }) {
  const rows = await AppDataSource.query(
    `SELECT r.id AS registration_id, r.clinic_id FROM registrations r JOIN patients p ON p.id = r.patient_id WHERE p.mobile = ANY($1::varchar[]) ORDER BY r.created_at DESC LIMIT 1`, [mobileLookupCandidates(mobile)],
  );
  if (!rows[0]) return null;
  return dispatchNotification({ clinicId: rows[0].clinic_id, registrationId: rows[0].registration_id, type: "otp_recovery", idempotencyKey: `otp:${challengeId}`, recipient: mobile, templateName: process.env.WHATSAPP_OTP_TEMPLATE || "queueless_recovery_otp", variables: [code], recordVariables: ["[REDACTED]"] });
}

export async function notifyApproachingPatients(clinicId, sessionId) {
  const settingsRows = await AppDataSource.query(`SELECT "notify_at_patients_ahead" AS threshold FROM "clinic_settings" WHERE "clinic_id" = $1`, [clinicId]);
  const threshold = Number(settingsRows[0]?.threshold || 3);
  const rows = await AppDataSource.query(
    `SELECT q.id AS queue_id, q.registration_id, p.name, p.mobile, r.reference, r.consent_to_contact
       FROM queue_entries q JOIN registrations r ON r.id = q.registration_id JOIN patients p ON p.id = r.patient_id
      WHERE q.session_id = $1 AND q.status = 'waiting'
      ORDER BY q.queue_order ASC LIMIT $2`, [sessionId, threshold],
  );
  for (const patient of approachingPatients(rows, threshold)) {
    await dispatchNotification({ clinicId, registrationId: patient.registration_id, type: "turn_approaching", idempotencyKey: `registration:${patient.registration_id}:turn-approaching:${sessionId}:${threshold}`, recipient: patient.mobile, templateName: process.env.WHATSAPP_TURN_TEMPLATE || "queueless_turn_approaching", variables: [patient.name, String(patient.position), patient.reference] });
  }
}

export async function simulateNotification({ clinicId, actorId, outcome }) {
  if (process.env.NODE_ENV === "production") throw Object.assign(new Error("Notification simulation is unavailable in production."), { status: 404 });
  const { randomUUID } = await import("node:crypto");
  const key = `simulator:${clinicId}:${actorId}:${randomUUID()}`;
  const notification = await dispatchNotification({ clinicId, type: "simulator_preview", idempotencyKey: key, templateName: "queueless_test_message", variables: ["QueueLess", "Test delivery"], simulateFailure: outcome === "failure", forceSimulator: true });
  if (notification.deliveryStatus === "failed") {
    throw Object.assign(new Error("The development simulator failed to deliver the test message."), { status: 502, notification });
  }
  return { ...notification, simulationMode: true, realMessageSent: false };
}

export async function listClinicNotifications(clinicId, { unreadOnly = false } = {}) {
  return AppDataSource.getRepository(Notification).find({ where: unreadOnly ? { clinicId, readAt: IsNull() } : { clinicId }, order: { createdAt: "DESC" }, take: 100 });
}

export async function retryFailedNotifications() {
  const repository = AppDataSource.getRepository(Notification);
  const records = await repository.createQueryBuilder("n")
    .where("n.delivery_status = 'failed' AND n.retry_count < 3 AND n.type NOT IN ('otp_recovery', 'registration_confirmation') AND n.created_at <= now() - interval '30 seconds'")
    .orderBy("n.created_at", "ASC").take(20).getMany();
  for (const record of records) {
    if (record.channel === "simulator" && process.env.NODE_ENV === "production") continue;
    let recipient;
    if (record.registrationId) {
      const rows = await repository.manager.query(`SELECT p.mobile, r.consent_to_contact FROM registrations r JOIN patients p ON p.id = r.patient_id WHERE r.id = $1`, [record.registrationId]);
      if (!rows[0]?.consent_to_contact) continue;
      recipient = rows[0].mobile;
    }
    record.retryCount += 1;
    try {
      const result = record.channel === "whatsapp"
        ? await sendWhatsAppTemplate({ recipient, templateName: record.payload.templateName, variables: record.payload.variables || [] })
        : await sendSimulatedMessage({ templateName: record.payload.templateName, variables: record.payload.variables || [] });
      record.deliveryStatus = record.channel === "whatsapp" ? "sent" : "simulated";
      record.providerReference = result.providerReference;
      record.failureReason = null;
    } catch (error) {
      record.failureReason = record.type === "otp_recovery"
        ? "Recovery code delivery failed."
        : record.channel === "simulator"
          ? "The development simulator failed to deliver the test message."
          : "Message delivery failed.";
    }
    await repository.save(record);
  }
}

import { AppDataSource } from "../../config/data-source.js";
import { Notification } from "../../entities/Notification.js";
import { sendSimulatedMessage } from "./providers/simulator.js";
import { sendWhatsAppTemplate } from "./providers/whatsapp-cloud.js";
import { approachingPatients } from "./notification-policy.js";

export async function dispatchNotification({ clinicId, registrationId = null, type, idempotencyKey, recipient, templateName, variables = [], recordVariables = variables, simulateFailure = false, forceSimulator = false }) {
  const repository = AppDataSource.getRepository(Notification);
  let record;
  try {
    record = await repository.save(repository.create({ clinicId, registrationId, type, idempotencyKey, channel: forceSimulator || process.env.NOTIFICATION_PROVIDER !== "whatsapp" ? "simulator" : "whatsapp", deliveryStatus: "pending", payload: { templateName, variables: recordVariables } }));
  } catch (error) {
    if (error.code !== "23505") throw error;
    return repository.findOneBy({ idempotencyKey });
  }

  try {
    const result = !forceSimulator && process.env.NOTIFICATION_PROVIDER === "whatsapp"
      ? await sendWhatsAppTemplate({ recipient, templateName, variables })
      : await sendSimulatedMessage({ templateName, variables, simulateFailure });
    record.deliveryStatus = process.env.NOTIFICATION_PROVIDER === "whatsapp" && !forceSimulator ? "sent" : "delivered";
    record.providerReference = result.providerReference;
    if (record.deliveryStatus === "delivered") record.deliveredAt = new Date();
  } catch (error) {
    record.deliveryStatus = "failed";
    record.failureReason = error.message.slice(0, 1000);
  }
  return repository.save(record);
}

export async function notifyRegistrationConfirmation(registrationId) {
  const registration = await AppDataSource.query(
    `SELECT r.id, r.clinic_id, r.reference, r.consent_to_contact, p.mobile, p.name, c.name AS clinic_name
       FROM registrations r JOIN patients p ON p.id = r.patient_id JOIN clinics c ON c.id = r.clinic_id WHERE r.id = $1`, [registrationId],
  ).then((rows) => rows[0]);
  if (!registration?.consent_to_contact) return null;
  return dispatchNotification({ clinicId: registration.clinic_id, registrationId, type: "registration_confirmation", idempotencyKey: `registration:${registrationId}:confirmation:v1`, recipient: registration.mobile, templateName: process.env.WHATSAPP_CONFIRMATION_TEMPLATE || "queueless_registration_confirmation", variables: [registration.name, registration.clinic_name, registration.reference] });
}

export async function sendRecoveryOtp({ mobile, challengeId, code }) {
  const rows = await AppDataSource.query(
    `SELECT r.id AS registration_id, r.clinic_id FROM registrations r JOIN patients p ON p.id = r.patient_id WHERE p.mobile = $1 ORDER BY r.created_at DESC LIMIT 1`, [mobile],
  );
  if (!rows[0]) return null;
  return dispatchNotification({ clinicId: rows[0].clinic_id, registrationId: rows[0].registration_id, type: "otp_recovery", idempotencyKey: `otp:${challengeId}`, recipient: mobile, templateName: process.env.WHATSAPP_OTP_TEMPLATE || "queueless_recovery_otp", variables: [code], recordVariables: ["[REDACTED]"], forceSimulator: process.env.NOTIFICATION_PROVIDER !== "whatsapp" });
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
  return dispatchNotification({ clinicId, type: "simulator_preview", idempotencyKey: key, templateName: "queueless_test_message", variables: ["QueueLess", "Test delivery"], simulateFailure: outcome === "failure", forceSimulator: true });
}

export async function listClinicNotifications(clinicId) {
  return AppDataSource.getRepository(Notification).find({ where: { clinicId }, order: { createdAt: "DESC" }, take: 100 });
}

export async function retryFailedNotifications() {
  const repository = AppDataSource.getRepository(Notification);
  const records = await repository.createQueryBuilder("n")
    .where("n.delivery_status = 'failed' AND n.retry_count < 3 AND n.type <> 'otp_recovery' AND n.created_at <= now() - interval '30 seconds'")
    .orderBy("n.created_at", "ASC").take(20).getMany();
  for (const record of records) {
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
      record.deliveryStatus = record.channel === "whatsapp" ? "sent" : "delivered";
      record.providerReference = result.providerReference;
      if (record.deliveryStatus === "delivered") record.deliveredAt = new Date();
      record.failureReason = null;
    } catch (error) {
      record.failureReason = error.message.slice(0, 1000);
    }
    await repository.save(record);
  }
}

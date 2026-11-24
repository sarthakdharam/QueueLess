import { AppDataSource } from "../../config/data-source.js";
import { Notification } from "../../entities/Notification.js";
import { sendSimulatedMessage } from "./providers/simulator.js";
import { sendWhatsAppTemplate } from "./providers/whatsapp-cloud.js";
import { approachingPatients } from "./notification-policy.js";
import { mobileLookupCandidates } from "../patient/mobile-lookup.js";
import { renderMockMessage } from "./mock-templates.js";
import { availableDoctor, callableAppointment, queuePriority } from "../queue/queue-order.js";
import { estimateQueueWait } from "../queue/wait-estimate.js";

function configuredProvider() {
  return process.env.NOTIFICATION_PROVIDER ||
    (process.env.NODE_ENV === "production" ? "disabled" : "simulator");
}

export function mockInboxEnabled() {
  return process.env.NODE_ENV === "development" &&
    process.env.DEV_MOCK_INBOX === "true" && configuredProvider() === "simulator";
}

async function mockRegistrationContext(registrationId, manager = AppDataSource) {
  const [context] = await manager.query(
    `SELECT p.name, p.mobile, c.name AS clinic, d.name AS doctor,
            q.token_number AS token, q.called_at, q.checked_in_at, q.status AS queue_status,
            q.session_id, r.clinic_id, r.consent_to_contact
       FROM registrations r JOIN patients p ON p.id = r.patient_id
       JOIN clinics c ON c.id = r.clinic_id
       LEFT JOIN doctors d ON d.id = r.doctor_id
       LEFT JOIN queue_entries q ON q.registration_id = r.id
      WHERE r.id = $1`, [registrationId],
  );
  return context;
}

export async function dispatchNotification(
  {
    clinicId,
    registrationId = null,
    type,
    idempotencyKey,
    recipient,
    templateName,
    variables = [],
    recordVariables = variables,
    simulateFailure,
    forceSimulator = false,
    mockContext,
    mockMessage,
    milestone,
    manualTest = false,
  },
  adapters = {},
) {
  const repository = (adapters.manager || AppDataSource).getRepository(Notification);
  const configuredMode = configuredProvider();
  const useSimulator = forceSimulator || configuredMode === "simulator";
  const channel = useSimulator
    ? "simulator"
    : configuredMode === "whatsapp"
      ? "whatsapp"
      : "disabled";
  let record;
  const capture = useSimulator && mockInboxEnabled();
  const context = capture && !mockContext && registrationId &&
    type !== "otp_recovery" ? await mockRegistrationContext(registrationId) : mockContext;
  const message = capture
    ? (type === "otp_recovery" ? renderMockMessage(type) : mockMessage ||
        renderMockMessage(type, { ...context, doctor: context?.doctor || undefined }, recordVariables))
    : null;
  try {
    record = await repository.save(
      repository.create({
        clinicId,
        registrationId,
        type,
        idempotencyKey,
        channel,
        deliveryStatus: "pending",
        payload: {
          templateName,
          variables: recordVariables,
          ...(milestone === undefined ? {} : { milestone }),
          ...(manualTest ? { manualTest: true } : {}),
        },
        ...(capture ? { message } : {}),
      }),
    );
  } catch (error) {
    if (error.code !== "23505") throw error;
    return repository.findOneBy({ idempotencyKey });
  }

  try {
    if (!useSimulator && configuredMode !== "whatsapp")
      throw new Error(
        "No supported notification provider is explicitly configured.",
      );
    if (useSimulator && process.env.NODE_ENV === "production")
      throw new Error(
        "The development notification simulator is disabled in production.",
      );
    const result = useSimulator
      ? await (adapters.sendSimulator || sendSimulatedMessage)({
          templateName,
          variables,
          simulateFailure,
          message,
          recipient,
          type,
          clinicId,
        })
      : await (adapters.sendWhatsApp || sendWhatsAppTemplate)({
          recipient,
          templateName,
          variables,
        });
    record.deliveryStatus = useSimulator ? "simulated" : "sent";
    record.providerReference = result.providerReference;
  } catch (error) {
    record.deliveryStatus = "failed";
    record.failureReason =
      type === "otp_recovery"
        ? "Recovery code delivery failed."
        : type === "simulator_preview"
          ? "The development simulator failed to deliver the test message."
          : "Message delivery failed.";
  }
  return repository.save(record);
}

export async function sendRecoveryOtp({ mobile, challengeId, code }) {
  const rows = await AppDataSource.query(
    `SELECT r.id AS registration_id, r.clinic_id FROM registrations r JOIN patients p ON p.id = r.patient_id WHERE p.mobile = ANY($1::varchar[]) ORDER BY r.created_at DESC LIMIT 1`,
    [mobileLookupCandidates(mobile)],
  );
  if (!rows[0]) return null;
  const notification = await dispatchNotification({
    clinicId: rows[0].clinic_id,
    registrationId: rows[0].registration_id,
    type: "otp_recovery",
    idempotencyKey: `otp:${challengeId}`,
    recipient: mobile,
    templateName: process.env.WHATSAPP_OTP_TEMPLATE || "queueless_recovery_otp",
    variables: [code],
    recordVariables: ["[REDACTED]"],
  });
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.OTP_DEV_LOG === "true" &&
    notification?.deliveryStatus === "simulated"
  ) {
    console.info(`[QueueLess development] Recovery OTP: ${code}`);
  }
  return notification;
}

export async function notifyApproachingPatients(clinicId, sessionId, checkedInRegistrationId = null) {
  if (mockInboxEnabled()) return notifyMockQueue(clinicId, sessionId, checkedInRegistrationId);
  const settingsRows = await AppDataSource.query(
    `SELECT "notify_at_patients_ahead" AS threshold FROM "clinic_settings" WHERE "clinic_id" = $1`,
    [clinicId],
  );
  const threshold = Number(settingsRows[0]?.threshold || 3);
  const rows = await AppDataSource.query(
    `SELECT q.id AS queue_id, q.registration_id, p.name, p.mobile, r.reference, r.consent_to_contact
       FROM queue_entries q JOIN registrations r ON r.id = q.registration_id JOIN patients p ON p.id = r.patient_id
      WHERE q.session_id = $1 AND q.status = 'waiting'
      ORDER BY q.queue_order ASC LIMIT $2`,
    [sessionId, threshold],
  );
  for (const patient of approachingPatients(rows, threshold)) {
    await dispatchNotification({
      clinicId,
      registrationId: patient.registration_id,
      type: "turn_approaching",
      idempotencyKey: `registration:${patient.registration_id}:turn-approaching:${sessionId}:${threshold}`,
      recipient: patient.mobile,
      templateName:
        process.env.WHATSAPP_TURN_TEMPLATE || "queueless_turn_approaching",
      variables: [patient.name, String(patient.position), patient.reference],
    });
  }
}

export async function notifyMockRegistration(clinicId, registrationId) {
  if (!mockInboxEnabled()) return;
  const context = await mockRegistrationContext(registrationId);
  if (!context) return;
  return dispatchNotification({
    clinicId, registrationId, type: "registration_confirmation",
    idempotencyKey: `mock-registration:${registrationId}`,
    recipient: context.mobile, templateName: "mock_registration_confirmation",
    mockContext: context, forceSimulator: true,
  });
}

export async function notifyVisitCompleted(clinicId, registrationId) {
  const [visit] = await AppDataSource.query(
    `SELECT r.reference, p.mobile FROM registrations r
       JOIN patients p ON p.id = r.patient_id
      WHERE r.id = $1 AND r.clinic_id = $2 AND r.status = 'completed'
        AND r.consent_to_contact`,
    [registrationId, clinicId],
  );
  if (!visit) return;
  const feedbackUrl = new URL(
    "/patient/recover",
    process.env.APP_BASE_URL || "http://localhost:5173",
  );
  feedbackUrl.searchParams.set("feedback", visit.reference);
  return dispatchNotification({
    clinicId,
    registrationId,
    type: "visit_completed",
    idempotencyKey: `visit-completed:${registrationId}`,
    recipient: visit.mobile,
    templateName:
      process.env.WHATSAPP_VISIT_COMPLETED_TEMPLATE || "queueless_visit_completed",
    variables: [feedbackUrl.toString()],
  });
}

export async function notifyMockTurn(clinicId, registrationId, sessionId) {
  if (!mockInboxEnabled()) return;
  const context = await mockRegistrationContext(registrationId);
  if (!context?.consent_to_contact || !context.called_at) return;
  return dispatchNotification({
    clinicId, registrationId, type: "your_turn",
    idempotencyKey: `mock-your-turn:${sessionId}:${registrationId}:${context.called_at.toISOString()}`,
    recipient: context.mobile, templateName: "mock_your_turn",
    mockContext: context, forceSimulator: true,
  });
}

async function notifyMockQueue(clinicId, sessionId, checkedInRegistrationId) {
  // Serialize snapshots of this queue so an earlier milestone cannot follow a later one.
  return AppDataSource.transaction(async (manager) => {
    await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`mock-milestones:${sessionId}`]);
    const [timing] = await manager.query(
      `SELECT coalesce(s.slot_duration_minutes, 15) AS slot_minutes,
              (SELECT max(q.consultation_started_at) FROM queue_entries q
                WHERE q.session_id = $1 AND q.status = 'in_consultation') AS consultation_started_at
         FROM clinics c LEFT JOIN clinic_settings s ON s.clinic_id = c.id
        WHERE c.id = $2`, [sessionId, clinicId],
    );
    if (!timing) return;
    const rows = await manager.query(
      `WITH ranked AS (
       SELECT r.id AS registration_id, r.consent_to_contact, p.name, p.mobile,
              q.token_number AS token, q.checked_in_at, a.scheduled_at, progress.closest_ahead,
              (row_number() OVER (ORDER BY ${queuePriority}, a.scheduled_at ASC NULLS LAST, q.queue_order ASC) - 1)::int AS ahead
         FROM queue_entries q JOIN registrations r ON r.id = q.registration_id
         JOIN patients p ON p.id = r.patient_id
         LEFT JOIN appointments a ON a.registration_id = r.id
         LEFT JOIN mock_queue_progress progress
           ON progress.session_id = q.session_id AND progress.registration_id = r.id
        WHERE q.session_id = $1 AND r.clinic_id = $2 AND q.status = 'waiting'
          AND ${callableAppointment} AND ${availableDoctor}
       )
       SELECT * FROM ranked WHERE ahead <= 5 OR registration_id = $3
       ORDER BY ahead`,
      [sessionId, clinicId, checkedInRegistrationId],
    );
    const now = Date.now();
    const estimate = ({ ahead, scheduled_at }) => estimateQueueWait({
      patientsAhead: ahead, slotMinutes: timing.slot_minutes,
      consultationStartedAt: timing.consultation_started_at,
      scheduledAt: scheduled_at, now,
    });
    if (checkedInRegistrationId) {
      const ranked = rows.find((row) => row.registration_id === checkedInRegistrationId);
      const patient = ranked || await mockRegistrationContext(checkedInRegistrationId, manager);
      if (patient?.consent_to_contact && patient.checked_in_at &&
          (ranked || (patient.queue_status === "waiting" &&
            patient.clinic_id === clinicId && patient.session_id === sessionId))) {
        const idempotencyKey = `mock-check-in:${checkedInRegistrationId}:${patient.checked_in_at.toISOString()}`;
        if (!(await manager.getRepository(Notification).existsBy({ idempotencyKey }))) {
          await dispatchNotification({
            clinicId, registrationId: checkedInRegistrationId, type: "patient_checked_in",
            idempotencyKey, recipient: patient.mobile, templateName: "mock_patient_checked_in",
            mockContext: { ...patient, estimate: ranked ? estimate(ranked) : undefined },
            forceSimulator: true,
          }, { manager });
        }
      }
    }
    for (const patient of rows) {
      const { ahead } = patient;
      if (ahead > 5) continue;
      if (patient.closest_ahead !== null && patient.closest_ahead <= ahead) continue;
      await manager.query(
        `INSERT INTO mock_queue_progress (session_id, registration_id, closest_ahead)
         VALUES ($1, $2, $3)
         ON CONFLICT (session_id, registration_id) DO UPDATE SET closest_ahead = EXCLUDED.closest_ahead`,
        [sessionId, patient.registration_id, ahead],
      );
      if (!patient.consent_to_contact || ![1, 3, 5].includes(ahead)) continue;
      const idempotencyKey = `mock-milestone:${sessionId}:${patient.registration_id}:${ahead}`;
      if (await manager.getRepository(Notification).existsBy({ idempotencyKey })) continue;
      await dispatchNotification({
        clinicId,
        registrationId: patient.registration_id,
        type: ahead === 5 ? "queue_progress" : "turn_approaching",
        idempotencyKey,
        recipient: patient.mobile,
        templateName: "mock_queue_milestone",
        mockContext: { ...patient, estimate: estimate(patient) },
        milestone: ahead,
        forceSimulator: true,
      }, { manager });
    }
  });
}

export async function simulateNotification({ clinicId, actorId, outcome }) {
  if (process.env.NODE_ENV === "production")
    throw Object.assign(
      new Error("Notification simulation is unavailable in production."),
      { status: 404 },
    );
  const { randomUUID } = await import("node:crypto");
  const key = `simulator:${clinicId}:${actorId}:${randomUUID()}`;
  const notification = await dispatchNotification({
    clinicId,
    type: "simulator_preview",
    idempotencyKey: key,
    templateName: "queueless_test_message",
    variables: ["QueueLess", "Test delivery"],
    simulateFailure: outcome === "failure",
    forceSimulator: true,
  });
  if (notification.deliveryStatus === "failed") {
    throw Object.assign(
      new Error(
        "The development simulator failed to deliver the test message.",
      ),
      { status: 502, notification },
    );
  }
  return { ...notification, simulationMode: true, realMessageSent: false };
}

export async function retryFailedNotifications() {
  const channel = configuredProvider();
  if (channel !== "simulator" && channel !== "whatsapp") return;
  const repository = AppDataSource.getRepository(Notification);
  const records = await repository
    .createQueryBuilder("n")
    .where(
      `n.delivery_status = 'failed' AND n.channel = :channel
       AND (n.channel <> 'simulator' OR n.message IS NULL)
       AND n.payload->>'manualTest' IS DISTINCT FROM 'true'
       AND n.retry_count < 3 AND n.type NOT IN ('otp_recovery', 'registration_confirmation')
       AND n.created_at <= now() - interval '30 seconds'`,
      { channel },
    )
    .orderBy("n.created_at", "ASC")
    .take(20)
    .getMany();
  for (const record of records) {
    if (record.channel === "simulator" && process.env.NODE_ENV === "production")
      continue;
    let recipient;
    if (record.registrationId) {
      const rows = await repository.manager.query(
        `SELECT p.mobile, r.consent_to_contact FROM registrations r JOIN patients p ON p.id = r.patient_id WHERE r.id = $1`,
        [record.registrationId],
      );
      if (!rows[0]?.consent_to_contact) continue;
      recipient = rows[0].mobile;
    }
    record.retryCount += 1;
    try {
      const result =
        record.channel === "whatsapp"
          ? await sendWhatsAppTemplate({
              recipient,
              templateName: record.payload.templateName,
              variables: record.payload.variables || [],
            })
          : await sendSimulatedMessage({
              templateName: record.payload.templateName,
              variables: record.payload.variables || [],
            });
      record.deliveryStatus =
        record.channel === "whatsapp" ? "sent" : "simulated";
      record.providerReference = result.providerReference;
      record.failureReason = null;
    } catch (error) {
      record.failureReason =
        record.type === "otp_recovery"
          ? "Recovery code delivery failed."
          : record.channel === "simulator"
            ? "The development simulator failed to deliver the test message."
            : "Message delivery failed.";
    }
    await repository.save(record);
  }
}

import { randomUUID } from "node:crypto";
import { AppDataSource } from "../../config/data-source.js";
import { dispatchNotification } from "./dispatch.js";
import { renderMockMessage } from "./mock-templates.js";

const projection = `
  SELECT n.id, n.type, n.delivery_status AS status, n.failure_reason AS error,
         n.provider_reference AS "providerMessageId", n.created_at AS "createdAt",
         n.updated_at AS "updatedAt", coalesce(p.id::text, 'system') AS "patientId",
         coalesce(p.name, 'Simulator') AS "patientName",
         CASE WHEN p.mobile IS NOT NULL THEN '•••• ' || right(p.mobile, 4) END AS phone,
         CASE WHEN n.type = 'visit_completed' THEN n.payload->'variables'->>0 END AS "feedbackUrl",
         CASE WHEN n.type = 'otp_recovery' THEN NULL ELSE n.message END AS message
    FROM notifications n
    LEFT JOIN registrations r ON r.id = n.registration_id AND r.clinic_id = n.clinic_id
    LEFT JOIN patients p ON p.id = r.patient_id
`;

function filters(clinicId, { patientId, type, status, q, id }) {
  const params = [clinicId];
  const where = ["n.clinic_id = $1", "n.channel = 'simulator'"];
  for (const [expression, value] of [
    ["coalesce(p.id::text, 'system') =", patientId],
    ["n.type =", type],
    ["n.delivery_status =", status],
    ["n.id =", id],
  ]) {
    if (value) where.push(`${expression} $${params.push(value)}`);
  }
  if (q) {
    const index = params.push(`%${q}%`);
    where.push(`(p.name ILIKE $${index} OR p.mobile LIKE $${index})`);
  }
  return { sql: `${projection} WHERE ${where.join(" AND ")}`, params };
}

function messageContent(row) {
  return {
    ...row,
    message: row.type === "otp_recovery"
      ? renderMockMessage("otp_recovery")
      : row.message || "Message preview was not saved for this older simulation.",
  };
}

export async function listMockMessages(clinicId, options = {}) {
  const { sql, params } = filters(clinicId, options);
  const { page = 1, limit = 30, view } = options;
  const scope = view === "conversations"
    ? `SELECT DISTINCT ON ("patientId") * FROM (${sql}) messages
       ORDER BY "patientId", "createdAt" DESC, id DESC`
    : sql;
  const rows = await AppDataSource.query(
    `SELECT * FROM (${scope}) result
     ORDER BY "createdAt" DESC, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit + 1, (page - 1) * limit],
  );
  return {
    page,
    limit,
    hasMore: rows.length > limit,
    messages: rows.slice(0, limit).map(messageContent),
  };
}

export async function listMockPatients(clinicId, q = "") {
  return AppDataSource.query(
    `SELECT p.id, p.name, '•••• ' || right(p.mobile, 4) AS phone
       FROM patients p
      WHERE EXISTS (SELECT 1 FROM registrations r WHERE r.patient_id = p.id AND r.clinic_id = $1)
        AND (p.name ILIKE $2 OR p.mobile LIKE $2)
      ORDER BY p.name, p.id LIMIT 50`,
    [clinicId, `%${q}%`],
  );
}

export async function getMockMessage(clinicId, id) {
  const { sql, params } = filters(clinicId, { id });
  const [row] = await AppDataSource.query(sql, params);
  return row ? messageContent(row) : null;
}

export async function testMockMessage(clinicId, { patientId, type, message, outcome }) {
  const [registration] = await AppDataSource.query(
    `SELECT r.id, p.name, p.mobile, c.name AS clinic, d.name AS doctor, q.token_number AS token,
            a.scheduled_at AS "scheduledAt", c.time_zone AS "timeZone"
       FROM registrations r JOIN patients p ON p.id = r.patient_id
       JOIN clinics c ON c.id = r.clinic_id
       LEFT JOIN doctors d ON d.id = r.doctor_id
       LEFT JOIN queue_entries q ON q.registration_id = r.id
       LEFT JOIN appointments a ON a.registration_id = r.id
      WHERE r.clinic_id = $1 AND r.patient_id = $2 ORDER BY r.created_at DESC LIMIT 1`,
    [clinicId, patientId],
  );
  if (!registration) return null;
  const context = { ...registration, doctor: registration.doctor || undefined };
  const preview = type === "otp_recovery" || type === "mock_otp"
    ? renderMockMessage(type)
    : message || renderMockMessage(type, context);
  if (outcome === "preview") return { message: preview };
  const result = await dispatchNotification({
    clinicId, registrationId: registration.id, type,
    idempotencyKey: `mock-test:${randomUUID()}`,
    recipient: registration.mobile,
    templateName: `mock_${type}`, mockMessage: preview, mockContext: context,
    simulateFailure: outcome === "failure", forceSimulator: true, manualTest: true,
  });
  return getMockMessage(clinicId, result.id);
}

export async function updateMockOutcome(clinicId, id, delivered) {
  const result = await AppDataSource.query(
    `UPDATE notifications SET delivery_status = $3,
       failure_reason = $4, delivered_at = CASE WHEN $5 THEN now() ELSE NULL END,
       payload = payload || '{"manualTest":true}'::jsonb, updated_at = now()
     WHERE id = $1 AND clinic_id = $2 AND channel = 'simulator' RETURNING id`,
    [id, clinicId, delivered ? "delivered_simulated" : "failed",
     delivered ? null : "Delivery failure simulated by a developer.", delivered],
  );
  return result[0].length ? getMockMessage(clinicId, id) : null;
}

import { randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { AppDataSource } from "../config/data-source.js";
import { Patient } from "../entities/Patient.js";
import { OtpChallenge } from "../entities/OtpChallenge.js";
import { Registration } from "../entities/Registration.js";
import { PatientLookupSession } from "../entities/PatientLookupSession.js";
import { createAccess } from "../services/patient/access-links.js";
import { createLookupSecret, lookupSecretHash, LOOKUP_SESSION_TTL_MS } from "../services/patient/lookup-sessions.js";
import { normalizeMobile } from "../services/patient/mobile.js";
import { otpHash } from "../services/patient/otp.js";
import { sendRecoveryOtp } from "../services/notifications/dispatch.js";
import { mobileLookupCandidates } from "../services/patient/mobile-lookup.js";
import { isOtpChallengeUsable } from "../services/patient/credential-policy.js";

export async function requestRecoveryCode(req, res, next) {
  const mobile = normalizeMobile(req.body.mobile);
  try {
    const candidates = mobileLookupCandidates(mobile);
    const patient = await AppDataSource.getRepository(Patient).createQueryBuilder("p").where("p.mobile IN (:...candidates)", { candidates }).getOne();
    let developmentCode;
    if (patient) {
      const code = String(randomInt(100000, 1000000));
      const id = randomUUID();
      const created = await AppDataSource.transaction(async (manager) => {
        await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`patient-otp:${mobile}`]);
        const recent = await manager.getRepository(OtpChallenge).createQueryBuilder("o")
          .where("o.mobile = :mobile AND o.created_at > now() - interval '60 seconds'", { mobile }).getOne();
        if (recent) return false;
        const repository = manager.getRepository(OtpChallenge);
        await repository.createQueryBuilder().update(OtpChallenge).set({ consumedAt: new Date() }).where('"mobile" = :mobile AND "consumed_at" IS NULL', { mobile }).execute();
        await repository.save(repository.create({ id, mobile, challengeHash: otpHash(id, code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) }));
        return true;
      });
      if (created) {
        void sendRecoveryOtp({ mobile, challengeId: id, code }).catch(() => console.error("Recovery OTP delivery failed."));
        if (process.env.NODE_ENV !== "production" && process.env.OTP_DEV_ECHO === "true") developmentCode = code;
      }
    }
    return res.status(202).json({ message: "If appointments exist for that mobile number, a verification code has been sent.", ...(developmentCode ? { developmentCode } : {}) });
  } catch (error) { return next(error); }

}

export async function verifyRecoveryCode(req, res, next) {
  const mobile = normalizeMobile(req.body.mobile);
  try {
    const valid = await AppDataSource.transaction(async (manager) => {
      const challenge = await manager.getRepository(OtpChallenge).createQueryBuilder("o").where("o.mobile = :mobile AND o.consumed_at IS NULL AND o.expires_at > now()", { mobile }).orderBy("o.created_at", "DESC").setLock("pessimistic_write").getOne();
      if (!isOtpChallengeUsable(challenge)) return false;
      challenge.attemptCount += 1;
      const expected = Buffer.from(challenge.challengeHash);
      const provided = Buffer.from(otpHash(challenge.id, req.body.code));
      if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
        await manager.getRepository(OtpChallenge).save(challenge);
        return false;
      }
      challenge.verifiedAt = new Date();
      challenge.consumedAt = new Date();
      await manager.getRepository(OtpChallenge).save(challenge);
      return true;
    });
    if (!valid) return res.status(400).json({ error: "The code is invalid or expired." });
    const secret = createLookupSecret();
    const expiresAt = new Date(Date.now() + LOOKUP_SESSION_TTL_MS);
    await AppDataSource.getRepository(PatientLookupSession).save(AppDataSource.getRepository(PatientLookupSession).create({ mobile, tokenHash: lookupSecretHash(secret), expiresAt }));
    return res.json({ lookupToken: secret, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }

}

export async function getMyAppointments(req, res, next) {
  try {
    const rows = await AppDataSource.query(`
      WITH queue_rank AS (
        SELECT q.registration_id,
          row_number() OVER (PARTITION BY q.session_id ORDER BY
            CASE WHEN a.status IN ('booked', 'checked_in') AND a.scheduled_at <= now() THEN 0
                 WHEN a.scheduled_at IS NULL OR a.status = 'returned' THEN 1 ELSE 2 END,
            a.scheduled_at ASC NULLS LAST, q.queue_order ASC)::int AS position
        FROM queue_entries q
        JOIN registrations r ON r.id = q.registration_id
        LEFT JOIN appointments a ON a.registration_id = r.id
        WHERE q.status = 'waiting'
      )
      SELECT r.reference, r.status AS registration_status, r.visit_type, r.created_at,
        c.name AS clinic_name, c.address AS clinic_address, c.city AS clinic_city, c.state AS clinic_state, c.time_zone,
        d.name AS doctor_name, d.specialization, a.scheduled_at, a.status AS appointment_status,
        q.status AS queue_status, q.token_number, q.checked_in_at, qr.position AS queue_position,
        COALESCE(cs.slot_duration_minutes, 15) AS slot_duration_minutes
      FROM registrations r
      JOIN clinics c ON c.id = r.clinic_id
      LEFT JOIN doctors d ON d.id = r.doctor_id
      LEFT JOIN appointments a ON a.registration_id = r.id
      LEFT JOIN queue_entries q ON q.registration_id = r.id
      LEFT JOIN queue_rank qr ON qr.registration_id = r.id
      LEFT JOIN clinic_settings cs ON cs.clinic_id = r.clinic_id
      WHERE r.patient_id IN (SELECT id FROM patients WHERE mobile = ANY($1::varchar[]))
        AND (r.status IN ('registered', 'waiting', 'called', 'in_consultation', 'missed')
          OR (a.scheduled_at >= now() AND a.status NOT IN ('cancelled', 'rescheduled'))
          OR r.created_at >= now() - interval '30 days')
      ORDER BY CASE WHEN a.scheduled_at >= now() THEN 0 ELSE 1 END, a.scheduled_at ASC NULLS LAST, r.created_at DESC
      LIMIT 100`, [mobileLookupCandidates(req.patientLookup.mobile)]);
    const now = Date.now();
    const appointments = rows.map((row) => {
      let estimate = null;
      if (row.queue_status === "waiting" && row.queue_position) {
        const duration = Number(row.slot_duration_minutes) || 15;
        const waitToAppointment = row.scheduled_at ? Math.max(0, Math.ceil((new Date(row.scheduled_at).getTime() - now) / 60000)) : 0;
        const minimumMinutes = Math.max((Number(row.queue_position) - 1) * duration, waitToAppointment);
        estimate = { minimumMinutes, maximumMinutes: minimumMinutes + duration + 10 };
      }
      return {
        reference: row.reference, registrationStatus: row.registration_status, visitType: row.visit_type,
        tokenNumber: row.token_number, queueStatus: row.queue_status, queuePosition: row.queue_status === "waiting" ? Number(row.queue_position) || null : null,
        arrivalStatus: row.checked_in_at ? "Checked in" : "Not checked in",
        clinic: { name: row.clinic_name, address: row.clinic_address, city: row.clinic_city, state: row.clinic_state, timeZone: row.time_zone },
        doctor: row.doctor_name ? { name: row.doctor_name, specialization: row.specialization } : null,
        appointment: row.scheduled_at ? { scheduledAt: new Date(row.scheduled_at).toISOString(), status: row.appointment_status } : null,
        arrivalInstructions: "Online registration does not confirm physical arrival. Please check in with the receptionist when you arrive.",
        estimate: estimate ? { ...estimate, disclaimer: "Queue position and wait estimates can change; this is not a guaranteed consultation time." } : null,
      };
    });
    return res.json({ appointments });
  } catch (error) { return next(error); }
}

export async function revokeMyAppointmentSession(req, res, next) {
  try {
    await AppDataSource.getRepository(PatientLookupSession).update({ id: req.patientLookup.id }, { revokedAt: new Date() });
    return res.status(204).end();
  } catch (error) { return next(error); }
}

export async function replaceAppointmentAccessLink(req, res, next) {
  try {
    const registration = await AppDataSource.getRepository(Registration).createQueryBuilder("r")
      .innerJoin("patients", "p", "p.id = r.patient_id")
      .where("p.mobile IN (:...candidates) AND r.reference = :reference", { candidates: mobileLookupCandidates(req.patientLookup.mobile), reference: String(req.params.reference).toUpperCase() })
      .getOne();
    if (!registration) return res.status(404).json({ error: "Appointment not found." });
    const access = await AppDataSource.transaction((manager) => createAccess(manager, registration.id));
    return res.json({ accessUrl: access.url });
  } catch (error) { return next(error); }
}

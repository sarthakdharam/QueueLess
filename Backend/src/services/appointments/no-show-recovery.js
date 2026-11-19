import { AppDataSource } from "../../config/data-source.js";
import { Appointment } from "../../entities/Appointment.js";
import { QueueEntry } from "../../entities/QueueEntry.js";
import { Registration } from "../../entities/Registration.js";
import {
  dateInZone,
  zonedTimeToUtc,
  clinicHoursForDate,
} from "../patient/clinic-availability.js";
import { dispatchNotification } from "../notifications/dispatch.js";
import { emitQueueChange } from "../../sockets/socket-server.js";

export const NO_SHOW_GRACE_MINUTES = 30;

export function isNoShowDue({
  scheduledAt,
  timeZone,
  workingHours,
  now = new Date(),
}) {
  const clinicTimeZone = timeZone || "Asia/Kolkata";
  const appointmentDate = dateInZone(new Date(scheduledAt), clinicTimeZone);
  const hours = clinicHoursForDate({}, { workingHours }, {}, appointmentDate);
  if (!hours?.enabled || !hours.close) return false;

  const closingTime = zonedTimeToUtc(
    appointmentDate,
    hours.close,
    clinicTimeZone,
  );
  return now.getTime() >= closingTime.getTime() + NO_SHOW_GRACE_MINUTES * 60000;
}

export function appointmentFitsClinicHours({
  scheduledAt,
  slotMinutes,
  timeZone,
  workingHours,
}) {
  const clinicTimeZone = timeZone || "Asia/Kolkata";
  const appointmentDate = dateInZone(new Date(scheduledAt), clinicTimeZone);
  const hours = clinicHoursForDate({}, { workingHours }, {}, appointmentDate);
  if (!hours?.enabled || !hours.open || !hours.close) return false;

  const opensAt = zonedTimeToUtc(appointmentDate, hours.open, clinicTimeZone);
  const closesAt = zonedTimeToUtc(appointmentDate, hours.close, clinicTimeZone);
  const startsAt = new Date(scheduledAt);
  const endsAt = new Date(startsAt.getTime() + Number(slotMinutes) * 60000);
  return startsAt >= opensAt && endsAt <= closesAt;
}

async function markAppointmentNeedsRescheduling(candidate) {
  return AppDataSource.transaction(async (manager) => {
    await manager.query(
      "SELECT id FROM appointments WHERE id = $1 FOR UPDATE",
      [candidate.appointment_id],
    );
    const appointment = await manager.getRepository(Appointment).findOneBy({
      id: candidate.appointment_id,
      status: "booked",
    });
    const registration = await manager.getRepository(Registration).findOneBy({
      id: candidate.registration_id,
      status: "registered",
    });
    const queueEntry = await manager.getRepository(QueueEntry).findOneBy({
      registrationId: candidate.registration_id,
      status: "registered",
    });
    if (!appointment || !registration || !queueEntry) return null;

    appointment.status = "needs_rescheduling";
    await manager.getRepository(Appointment).save(appointment);
    return {
      appointmentId: appointment.id,
      clinicId: appointment.clinicId,
      registrationId: appointment.registrationId,
    };
  });
}

export async function reconcileAppointmentsOutsideClinicHours({
  now = new Date(),
} = {}) {
  const candidates = await AppDataSource.query(
    `SELECT a.id AS appointment_id, a.scheduled_at, a.slot_minutes,
            r.id AS registration_id, r.consent_to_contact, p.mobile,
            c.time_zone, s.working_hours
       FROM appointments a
       JOIN registrations r ON r.id = a.registration_id
       JOIN queue_entries q ON q.registration_id = r.id
       JOIN patients p ON p.id = r.patient_id
       JOIN clinics c ON c.id = a.clinic_id
       JOIN clinic_settings s ON s.clinic_id = a.clinic_id
      WHERE a.status = 'booked'
        AND r.status = 'registered'
        AND q.status = 'registered'
        AND a.scheduled_at >= CAST($1 AS timestamptz) - interval '1 day'`,
    [now],
  );

  const affected = [];
  for (const candidate of candidates) {
    if (
      appointmentFitsClinicHours({
        scheduledAt: candidate.scheduled_at,
        slotMinutes: candidate.slot_minutes,
        timeZone: candidate.time_zone,
        workingHours: candidate.working_hours,
      })
    )
      continue;

    const result = await markAppointmentNeedsRescheduling(candidate);
    if (!result) continue;
    affected.push(result);
    emitQueueChange({
      clinicId: result.clinicId,
      registrationId: result.registrationId,
      status: "needs_rescheduling",
      type: "appointment:hoursChanged",
    });
    if (!candidate.consent_to_contact) continue;
    await dispatchNotification({
      clinicId: result.clinicId,
      registrationId: result.registrationId,
      type: "appointment_hours_reschedule",
      idempotencyKey: `hours-changed:${result.appointmentId}:${new Date(candidate.scheduled_at).toISOString()}`,
      recipient: candidate.mobile,
      templateName: "queueless_appointment_hours_changed",
      variables: ["Your appointment needs a new time."],
    });
  }
  return affected;
}

async function markAppointmentMissed(candidate, now) {
  return AppDataSource.transaction(async (manager) => {
    await manager.query(
      "SELECT id FROM appointments WHERE id = $1 FOR UPDATE",
      [candidate.appointment_id],
    );

    const appointment = await manager.getRepository(Appointment).findOneBy({
      id: candidate.appointment_id,
      status: "booked",
    });
    const registration = await manager.getRepository(Registration).findOneBy({
      id: candidate.registration_id,
      status: "registered",
    });
    const queueEntry = await manager.getRepository(QueueEntry).findOneBy({
      registrationId: candidate.registration_id,
      status: "registered",
    });
    if (!appointment || !registration || !queueEntry) return null;

    appointment.status = "missed";
    await manager.getRepository(Appointment).save(appointment);
    await manager
      .getRepository(Registration)
      .update({ id: registration.id }, { status: "missed" });
    await manager
      .getRepository(QueueEntry)
      .update({ id: queueEntry.id }, { status: "missed" });

    return {
      appointmentId: appointment.id,
      clinicId: appointment.clinicId,
      registrationId: registration.id,
      markedAt: now.toISOString(),
    };
  });
}

export async function recoverOverdueAppointments({ now = new Date() } = {}) {
  const candidates = await AppDataSource.query(
    `SELECT a.id AS appointment_id, a.scheduled_at, r.id AS registration_id,
            r.clinic_id, r.consent_to_contact, p.mobile, c.time_zone,
            s.working_hours
       FROM appointments a
       JOIN registrations r ON r.id = a.registration_id
       JOIN queue_entries q ON q.registration_id = r.id
       JOIN patients p ON p.id = r.patient_id
       JOIN clinics c ON c.id = a.clinic_id
       JOIN clinic_settings s ON s.clinic_id = a.clinic_id
      WHERE a.status = 'booked'
        AND r.status = 'registered'
        AND q.status = 'registered'
        AND a.scheduled_at < $1`,
    [now],
  );

  const recovered = [];
  for (const candidate of candidates) {
    if (
      !isNoShowDue({
        scheduledAt: candidate.scheduled_at,
        timeZone: candidate.time_zone,
        workingHours: candidate.working_hours,
        now,
      })
    )
      continue;

    const result = await markAppointmentMissed(candidate, now);
    if (!result) continue;
    recovered.push(result);
    emitQueueChange({
      clinicId: result.clinicId,
      registrationId: result.registrationId,
      status: "missed",
      type: "appointment:noShow",
    });

    if (!candidate.consent_to_contact) continue;
    await dispatchNotification({
      clinicId: result.clinicId,
      registrationId: result.registrationId,
      type: "missed_appointment_reschedule",
      idempotencyKey: `no-show:${result.appointmentId}:${new Date(candidate.scheduled_at).toISOString()}`,
      recipient: candidate.mobile,
      templateName: "queueless_missed_appointment_reschedule",
      variables: ["Open your private appointment link to choose a new time."],
    });
  }
  return recovered;
}

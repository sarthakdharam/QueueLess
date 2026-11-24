import { AppDataSource } from "../config/data-source.js";
import { recordClinicNotification } from "../services/notifications/clinic-notifications.js";
import { ClinicSettings } from "../entities/ClinicSettings.js";
import { Registration } from "../entities/Registration.js";
import { PatientAccessToken } from "../entities/PatientAccessToken.js";
import { Appointment } from "../entities/Appointment.js";
import { AppointmentReschedule } from "../entities/AppointmentReschedule.js";
import { QueueSession } from "../entities/QueueSession.js";
import { QueueEntry } from "../entities/QueueEntry.js";
import { createAccess } from "../services/patient/access-links.js";
import {
  disconnectPatientSockets,
  emitQueueChange,
} from "../sockets/socket-server.js";
import {
  addDays,
  availableSlots,
  dateInZone,
  loadPublicClinic,
  zonedTimeToUtc,
  OPEN_STATUSES,
} from "../services/patient/clinic-availability.js";
import { activeEmergencyForSlot } from "../services/clinic/doctor-emergencies.js";
import { dispatchNotification } from "../services/notifications/dispatch.js";
import { estimateQueueWait } from "../services/queue/wait-estimate.js";
import {
  RESCHEDULABLE_APPOINTMENT_STATUSES,
  rescheduleMode,
} from "../services/patient/appointment-rescheduling.js";

function canCancelAppointment(appointmentStatus, queueStatus, registrationStatus) {
  return (
    queueStatus === registrationStatus &&
    [
      "booked",
      "confirmed",
      "needs_attention",
      "needs_rescheduling",
      "checked_in",
    ].includes(appointmentStatus) &&
    ["registered", "waiting"].includes(queueStatus)
  );
}

export async function getPatientRegistration(req, res, next) {
  try {
    const raw = await AppDataSource.getRepository(Registration)
      .createQueryBuilder("r")
      .innerJoin("clinics", "c", "c.id = r.clinic_id")
      .innerJoin("patients", "p", "p.id = r.patient_id")
      .leftJoin("doctors", "d", "d.id = r.doctor_id")
      .leftJoin("appointments", "a", "a.registration_id = r.id")
      .leftJoin("queue_entries", "q", "q.registration_id = r.id")
      .leftJoin("queue_sessions", "s", "s.id = q.session_id")
      .where("r.id = :id", { id: req.patientAccess.registrationId })
      .select([
        "r.id AS registration_id",
        "r.reference AS reference",
        "r.status AS status",
        "r.visit_type AS visit_type",
        "r.consent_to_contact AS consent_to_contact",
        "r.created_at AS created_at",
        "p.name AS patient_name",
        "c.id AS clinic_id",
        "c.name AS clinic_name",
        "c.address AS clinic_address",
        "c.city AS clinic_city",
        "c.state AS clinic_state",
        "c.contact_number AS clinic_contact",
        "c.time_zone AS time_zone",
        "d.name AS doctor_name",
        "d.specialization AS specialization",
        "a.scheduled_at AS scheduled_at",
        "a.slot_minutes AS slot_minutes",
        "a.status AS appointment_status",
        "q.status AS queue_status",
        "q.token_number AS token_number",
        "q.session_id AS session_id",
      ])
      .getRawOne();
    if (!raw) return res.status(404).json({ error: "Registration not found." });
    let position = null;
    if (raw.queue_status === "waiting") {
      const ordered = await AppDataSource.getRepository(QueueEntry)
        .createQueryBuilder("q")
        .innerJoin("registrations", "r", "r.id = q.registration_id")
        .leftJoin("appointments", "a", "a.registration_id = r.id")
        .where("q.session_id = :sessionId AND q.status = 'waiting'", {
          sessionId: raw.session_id,
        })
        .select(["r.id AS registration_id"])
        .orderBy(
          "CASE WHEN a.status IN ('booked', 'checked_in') AND a.scheduled_at <= now() THEN 0 WHEN a.scheduled_at IS NULL OR a.status = 'returned' THEN 1 ELSE 2 END",
          "ASC",
        )
        .addOrderBy("a.scheduled_at", "ASC", "NULLS LAST")
        .addOrderBy("q.queue_order", "ASC")
        .getRawMany();
      const index = ordered.findIndex(
        (entry) => entry.registration_id === raw.registration_id,
      );
      position = index < 0 ? null : index + 1;
    }
    const settings = await AppDataSource.getRepository(
      ClinicSettings,
    ).findOneBy({ clinicId: raw.clinic_id });
    const timeToAppointment = raw.scheduled_at
      ? new Date(raw.scheduled_at).toISOString()
      : null;
    let estimate = null;
    if (position) {
      const duration = settings?.slotDurationMinutes || 15;
      const session = await AppDataSource.getRepository(QueueSession).findOneBy(
        { id: raw.session_id },
      );
      const consulting =
        session &&
        (await AppDataSource.getRepository(QueueEntry).findOneBy({
          sessionId: session.id,
          status: "in_consultation",
        }));
      estimate = {
        ...estimateQueueWait({
          patientsAhead: position - 1,
          slotMinutes: duration,
          consultationStartedAt: consulting?.consultationStartedAt,
          scheduledAt: raw.scheduled_at,
        }),
        disclaimer:
          "This is an estimate based on queue position and configured slot length; delays may change it.",
      };
    }
    const feedback = await AppDataSource.query(
      `SELECT rating, categories, comment, created_at
         FROM appointment_feedback
        WHERE registration_id = $1`,
      [raw.registration_id],
    );
    return res.json({
      registration: {
        reference: raw.reference,
        status: raw.status,
        visitType: raw.visit_type,
        tokenNumber: raw.token_number,
        queueStatus: raw.queue_status,
        queuePosition: position,
        createdAt: raw.created_at,
      },
      notificationsAllowed: raw.consent_to_contact,
      patient: { name: raw.patient_name },
      clinic: {
        id: raw.clinic_id,
        name: raw.clinic_name,
        address: raw.clinic_address,
        city: raw.clinic_city,
        state: raw.clinic_state,
        contactNumber: raw.clinic_contact,
        timeZone: raw.time_zone,
      },
      doctor: raw.doctor_name
        ? { name: raw.doctor_name, specialization: raw.specialization }
        : null,
      appointment: timeToAppointment
        ? {
            scheduledAt: timeToAppointment,
            slotMinutes: raw.slot_minutes,
            status: raw.appointment_status,
            canCancel: canCancelAppointment(
              raw.appointment_status,
              raw.queue_status,
              raw.status,
            ),
          }
        : null,
      arrivalInstructions:
        "Online registration does not confirm physical arrival. Please check in with the receptionist when you reach the clinic.",
      estimate,
      feedback: {
        eligible: raw.queue_status === "completed",
        submitted: feedback.length > 0,
        response: feedback[0]
          ? {
              rating: Number(feedback[0].rating),
              categories: feedback[0].categories || [],
              comment: feedback[0].comment,
              createdAt: feedback[0].created_at,
            }
          : null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function submitAppointmentFeedback(req, res, next) {
  try {
    const { rating, categories = [], comment = "" } = req.body;
    const cleanCategories = [...new Set(categories)]
      .filter((item) => typeof item === "string")
      .slice(0, 5);
    const cleanComment = comment.trim();
    const result = await AppDataSource.transaction(async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        `feedback:${req.patientAccess.registrationId}`,
      ]);
      const rows = await manager.query(
        `SELECT r.clinic_id
           FROM registrations r
           JOIN queue_entries q ON q.registration_id = r.id
          WHERE r.id = $1 AND q.status = 'completed'
          FOR UPDATE`,
        [req.patientAccess.registrationId],
      );
      if (!rows[0]) {
        throw Object.assign(
          new Error(
            "Feedback is available after your consultation is completed.",
          ),
          { status: 409 },
        );
      }
      const existing = await manager.query(
        `SELECT id FROM appointment_feedback WHERE registration_id = $1`,
        [req.patientAccess.registrationId],
      );
      if (existing[0]) {
        throw Object.assign(new Error("Feedback has already been submitted."), {
          status: 409,
        });
      }
      const [feedback] = await manager.query(
        `INSERT INTO appointment_feedback (registration_id, clinic_id, rating, categories, comment)
         VALUES ($1, $2, $3, $4::jsonb, $5)
         RETURNING rating, categories, comment, created_at`,
        [
          req.patientAccess.registrationId,
          rows[0].clinic_id,
          rating,
          JSON.stringify(cleanCategories),
          cleanComment || null,
        ],
      );
      return feedback;
    });
    return res.status(201).json({
      feedback: {
        rating: Number(result.rating),
        categories: result.categories || [],
        comment: result.comment,
        createdAt: result.created_at,
      },
      message: "Thank you for sharing your feedback.",
    });
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    return next(error);
  }
}

export async function rotatePatientAccess(req, res, next) {
  try {
    const result = await AppDataSource.transaction((manager) =>
      createAccess(manager, req.patientAccess.registrationId),
    );
    return res.json({ accessUrl: result.url });
  } catch (error) {
    return next(error);
  }
}

export async function revokePatientAccess(req, res, next) {
  try {
    await AppDataSource.getRepository(PatientAccessToken).update(
      { id: req.patientAccess.tokenId },
      { revokedAt: new Date() },
    );
    await disconnectPatientSockets(req.patientAccess.registrationId);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}

export async function updateNotificationPreference(req, res, next) {
  try {
    await AppDataSource.getRepository(Registration).update(
      { id: req.patientAccess.registrationId },
      { consentToContact: req.body.enabled },
    );
    return res.json({ notificationsAllowed: req.body.enabled });
  } catch (error) {
    return next(error);
  }
}

export async function cancelPatientAppointment(req, res, next) {
  const { registrationId } = req.patientAccess;
  const expectedScheduledAt = new Date(req.body.expectedScheduledAt).getTime();
  try {
    const cancelled = await AppDataSource.transaction(async (manager) => {
      const visit = await manager
        .getRepository(Appointment)
        .createQueryBuilder("a")
        .innerJoin("queue_entries", "q", "q.registration_id = a.registration_id")
        .innerJoin("registrations", "r", "r.id = a.registration_id")
        .innerJoin("patients", "p", "p.id = r.patient_id")
        .where("a.registration_id = :registrationId", { registrationId })
        .select([
          "a.id AS appointment_id",
          "a.clinic_id AS clinic_id",
          "a.scheduled_at AS scheduled_at",
          "a.status AS appointment_status",
          "q.id AS queue_id",
          "q.status AS queue_status",
          "r.status AS registration_status",
          "r.reference AS reference",
          "CASE WHEN r.consent_to_contact THEN p.mobile END AS recipient",
        ])
        .setLock("pessimistic_write", undefined, ["a", "q", "r"])
        .setOnLocked("nowait")
        .getRawOne();
      if (!visit)
        throw Object.assign(new Error("Appointment not found."), { status: 404 });
      if (visit.appointment_status === "cancelled") return null;
      if (new Date(visit.scheduled_at).getTime() !== expectedScheduledAt) {
        throw Object.assign(
          new Error("The appointment time has changed. Refresh before cancelling."),
          { status: 409 },
        );
      }
      if (
        !canCancelAppointment(
          visit.appointment_status,
          visit.queue_status,
          visit.registration_status,
        )
      ) {
        throw Object.assign(
          new Error(
            "This appointment can no longer be cancelled online. Contact the clinic for help.",
          ),
          { status: 409 },
        );
      }
      const status = { status: "cancelled" };
      await manager
        .getRepository(Appointment)
        .update(visit.appointment_id, status);
      await manager.getRepository(Registration).update(registrationId, status);
      await manager.getRepository(QueueEntry).update(visit.queue_id, status);
      const eventKey = `cancellation:${visit.appointment_id}`;
      await recordClinicNotification(manager, {
        registrationId,
        type: "appointment_cancellation",
        eventKey,
      });
      return { ...visit, eventKey };
    });
    if (cancelled) {
      emitQueueChange({
        clinicId: cancelled.clinic_id,
        registrationId,
        status: "cancelled",
      });
      if (cancelled.recipient) {
        void dispatchNotification({
          clinicId: cancelled.clinic_id,
          registrationId,
          type: "appointment_cancellation",
          idempotencyKey: cancelled.eventKey,
          recipient: cancelled.recipient,
          templateName:
            process.env.WHATSAPP_CANCELLATION_TEMPLATE ||
            "queueless_appointment_cancellation",
          variables: [cancelled.reference],
        }).catch(() =>
          console.error("Appointment cancellation notification failed."),
        );
      }
    }
    return res.json({ status: "cancelled" });
  } catch (error) {
    if (error.code === "55P03")
      return res.status(409).json({
        error: "The clinic is updating this appointment. Please try again.",
      });
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    return next(error);
  }
}

export async function getRescheduleOptions(req, res, next) {
  try {
    const appointment = await AppDataSource.getRepository(
      Appointment,
    ).findOneBy({ registrationId: req.patientAccess.registrationId });
    const mode = rescheduleMode(appointment);
    if (!mode)
      return res.status(409).json({
        error: "This appointment does not currently need rescheduling.",
      });
    const clinicData = await loadPublicClinic(appointment.clinicId);
    const doctor = clinicData?.doctors.find(
      (item) => item.id === appointment.doctorId,
    );
    if (!clinicData || !doctor)
      return res
        .status(404)
        .json({ error: "Appointment availability could not be found." });
    const today = dateInZone(
      new Date(),
      clinicData.clinic.timeZone || "Asia/Kolkata",
    );
    const days = [];
    for (let offset = 0; offset <= 60 && days.length < 7; offset += 1) {
      const date = addDays(today, offset);
      const slots = await availableSlots({
        clinic: clinicData.clinic,
        settings: clinicData.settings,
        doctor,
        date,
      });
      if (slots.length) days.push({ date, slots });
    }
    return res.json({
      doctor: { id: doctor.id, name: doctor.name },
      mode,
      days,
    });
  } catch (error) {
    return next(error);
  }
}

export async function reschedulePatientAppointment(req, res, next) {
  try {
    const { date, slotTime, expectedScheduledAt } = req.body;
    const appointment = await AppDataSource.getRepository(
      Appointment,
    ).findOneBy({ registrationId: req.patientAccess.registrationId });
    const mode = rescheduleMode(appointment);
    if (!mode)
      return res.status(409).json({
        error: "This appointment does not currently need rescheduling.",
      });
    const clinicData = await loadPublicClinic(appointment.clinicId);
    const doctor = clinicData?.doctors.find(
      (item) => item.id === appointment.doctorId,
    );
    if (!clinicData || !doctor)
      return res
        .status(404)
        .json({ error: "Appointment availability could not be found." });
    const slot = zonedTimeToUtc(
      date,
      slotTime,
      clinicData.clinic.timeZone || "Asia/Kolkata",
    );
    const allowed = await availableSlots({
      clinic: clinicData.clinic,
      settings: clinicData.settings,
      doctor,
      date,
    });
    if (!allowed.some((item) => item.startsAt === slot.toISOString()))
      return res.status(409).json({
        error:
          "That replacement slot is no longer available. Choose another time.",
      });
    const rescheduleResult = await AppDataSource.transaction(async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        `appointment:${appointment.clinicId}:${appointment.doctorId}:${slot.toISOString()}`,
      ]);
      const current = await manager
        .getRepository(Appointment)
        .createQueryBuilder("a")
        .where(
          "a.id = :id AND a.status IN (:...statuses) AND a.scheduled_at = :expectedScheduledAt",
          {
            id: appointment.id,
            statuses: RESCHEDULABLE_APPOINTMENT_STATUSES,
            expectedScheduledAt: new Date(expectedScheduledAt),
          },
        )
        .getOne();
      if (!current)
        throw Object.assign(
          new Error(
            "This appointment has changed. Refresh and choose a time again.",
          ),
          { status: 409 },
        );
      if (!rescheduleMode(current))
        throw Object.assign(
          new Error("This appointment can no longer be changed."),
          { status: 409 },
        );
      if (
        await activeEmergencyForSlot({
          doctorId: current.doctorId,
          startsAt: slot,
          endsAt: new Date(slot.getTime() + current.slotMinutes * 60000),
        })
      )
        throw Object.assign(
          new Error(
            "This doctor is unavailable at that time. Choose another slot.",
          ),
          { status: 409 },
        );
      const count = await manager
        .getRepository(Appointment)
        .createQueryBuilder("a")
        .where(
          "a.clinic_id = :clinicId AND a.doctor_id = :doctorId AND a.scheduled_at = :slot AND a.status IN (:...statuses)",
          {
            clinicId: current.clinicId,
            doctorId: current.doctorId,
            slot,
            statuses: OPEN_STATUSES,
          },
        )
        .getCount();
      if (count >= clinicData.settings.appointmentCapacity)
        throw Object.assign(
          new Error(
            "That replacement slot has just filled. Choose another time.",
          ),
          { status: 409 },
        );
      const queueEntry = await manager
        .getRepository(QueueEntry)
        .findOneBy({ registrationId: current.registrationId });
      let session = await manager.getRepository(QueueSession).findOneBy({
        clinicId: current.clinicId,
        doctorId: current.doctorId,
        sessionDate: date,
      });
      if (!session)
        session = await manager.getRepository(QueueSession).save(
          manager.getRepository(QueueSession).create({
            clinicId: current.clinicId,
            doctorId: current.doctorId,
            sessionDate: date,
          }),
        );
      if (queueEntry) {
        const max = await manager
          .getRepository(QueueEntry)
          .createQueryBuilder("q")
          .where("q.session_id = :sessionId", { sessionId: session.id })
          .select("MAX(q.token_number)", "max_token")
          .addSelect("MAX(q.queue_order)", "max_order")
          .getRawOne();
        await manager.getRepository(QueueEntry).update(
          { id: queueEntry.id },
          {
            sessionId: session.id,
            tokenNumber: Number(max.max_token || 0) + 1,
            queueOrder: Number(max.max_order || 0) + 1000,
            status: "registered",
            checkedInAt: null,
            calledAt: null,
            consultationStartedAt: null,
          },
        );
      }
      const oldTime = current.scheduledAt;
      current.scheduledAt = slot;
      current.status = "booked";
      await manager.getRepository(Appointment).save(current);
      await manager
        .getRepository(Registration)
        .update({ id: current.registrationId }, { status: "registered" });
      const reschedule = await manager.getRepository(AppointmentReschedule).save(
        manager.getRepository(AppointmentReschedule).create({
          appointmentId: current.id,
          previousScheduledAt: oldTime,
          newScheduledAt: slot,
          changedBy: mode,
        }),
      );
      const eventKey = `reschedule:${reschedule.id}`;
      await recordClinicNotification(manager, {
        registrationId: current.registrationId,
        type: "reschedule_confirmation",
        eventKey,
      });
      return { appointment: current, eventKey };
    });
    const { appointment: result, eventKey } = rescheduleResult;
    const registrationRows = await AppDataSource.query(
      `SELECT r.clinic_id, r.consent_to_contact, p.mobile FROM registrations r JOIN patients p ON p.id = r.patient_id WHERE r.id = $1`,
      [result.registrationId],
    );
    if (registrationRows[0]?.consent_to_contact)
      void dispatchNotification({
        clinicId: result.clinicId,
        registrationId: result.registrationId,
        type: "reschedule_confirmation",
        idempotencyKey: eventKey,
        recipient: registrationRows[0].mobile,
        templateName: "queueless_reschedule_confirmation",
        variables: [doctor.name, date, slotTime],
      }).catch(() => {});
    return res.json({
      appointment: {
        scheduledAt: result.scheduledAt,
        status: result.status,
        doctor: doctor.name,
      },
      message: "Your appointment has been rescheduled.",
    });
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    return next(error);
  }
}

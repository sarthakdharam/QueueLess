import { IsNull } from "typeorm";
import { AppDataSource } from "../../config/data-source.js";
import { Notification } from "../../entities/Notification.js";

const channel = "clinic";

export async function recordClinicNotification(
  manager,
  { registrationId, type, eventKey },
) {
  await manager.query(
    `INSERT INTO notifications
       (clinic_id, registration_id, channel, type, idempotency_key, delivery_status, payload)
     SELECT clinic_id, id, $2, $3, $4, 'recorded', jsonb_build_object('reference', reference)
       FROM registrations WHERE id = $1
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [registrationId, channel, type, `clinic:${eventKey}`],
  );
}

export function listClinicNotifications(clinicId, { unreadOnly = false } = {}) {
  return AppDataSource.getRepository(Notification).find({
    where: { clinicId, channel, ...(unreadOnly ? { readAt: IsNull() } : {}) },
    order: { createdAt: "DESC" },
    take: 100,
  });
}

export function countUnreadClinicNotifications(clinicId) {
  return AppDataSource.getRepository(Notification).countBy({
    clinicId,
    channel,
    readAt: IsNull(),
  });
}

export function markClinicNotificationsRead(clinicId) {
  return AppDataSource.getRepository(Notification).update(
    { clinicId, channel, readAt: IsNull() },
    { readAt: new Date() },
  );
}

import { AppDataSource } from "../../config/data-source.js";
import { DoctorAvailabilityEvent } from "../../entities/DoctorAvailabilityEvent.js";

export const EMERGENCY_MODES = ["temporary", "full_day", "until_notice"];

export async function activeEmergencyForSlot({ doctorId, startsAt, endsAt }) {
  return AppDataSource.getRepository(DoctorAvailabilityEvent).createQueryBuilder("e")
    .where("e.doctor_id = :doctorId AND e.status = 'active'", { doctorId })
    .andWhere("e.starts_at < :endsAt", { endsAt })
    .andWhere("e.ends_at IS NULL OR e.ends_at > :startsAt", { startsAt })
    .orderBy("e.starts_at", "DESC").getOne();
}

export function emergencyAffectsSlot(event, startsAt, endsAt) {
  if (!event || event.status !== "active") return false;
  const starts = new Date(startsAt).getTime();
  const ends = new Date(endsAt).getTime();
  const eventStarts = new Date(event.startsAt).getTime();
  const eventEnds = event.endsAt ? new Date(event.endsAt).getTime() : Number.POSITIVE_INFINITY;
  return eventStarts < ends && eventEnds > starts;
}

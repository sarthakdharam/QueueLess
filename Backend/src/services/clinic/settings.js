import { ClinicSettings } from "../../entities/ClinicSettings.js";

export const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
export const DEFAULT_HOURS = Object.fromEntries(DAYS.map((day, index) => [day, { enabled: index < 6, open: "09:00", close: "17:00" }]));

export async function getSettings(manager, clinicId) {
  await manager.query(`INSERT INTO "clinic_settings" ("clinic_id") VALUES ($1) ON CONFLICT ("clinic_id") DO NOTHING`, [clinicId]);
  const repository = manager.getRepository(ClinicSettings);
  const settings = await repository.findOneBy({ clinicId });
  if (!Object.keys(settings.workingHours || {}).length) {
    settings.workingHours = DEFAULT_HOURS;
    return repository.save(settings);
  }
  return settings;
}

export function cleanSettings(input) {
  return {
    workingHours: input.workingHours, breaks: input.breaks || [],
    slotDurationMinutes: input.slotDurationMinutes, appointmentCapacity: input.appointmentCapacity,
    walkInsEnabled: input.walkInsEnabled, notifyAtPatientsAhead: input.notifyAtPatientsAhead,
    missedTurnPolicy: input.missedTurnPolicy || "after_waiting", returnPatientsAhead: input.returnPatientsAhead ?? 5,
  };
}

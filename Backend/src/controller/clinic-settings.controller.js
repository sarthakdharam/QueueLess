import { AppDataSource } from "../config/data-source.js";
import { Clinic } from "../entities/Clinic.js";
import { ClinicSettings } from "../entities/ClinicSettings.js";
import { Doctor } from "../entities/Doctor.js";
import { cleanSettings, DAYS, DEFAULT_HOURS, getSettings } from "../services/clinic/settings.js";

export async function getSetup(req, res, next) {
  try {
    const [clinic, settings, doctors] = await Promise.all([
      AppDataSource.getRepository(Clinic).findOneBy({ id: req.auth.clinicId }),
      getSettings(AppDataSource.manager, req.auth.clinicId),
      AppDataSource.getRepository(Doctor).find({ where: { clinicId: req.auth.clinicId, status: "active" }, order: { createdAt: "ASC" } }),
    ]);
    return res.json({ clinic, settings, doctors, setupComplete: doctors.length > 0 && DAYS.some((day) => settings.workingHours?.[day]?.enabled) });
  } catch (error) { return next(error); }

}

export async function updateClinicProfile(req, res, next) {
  try {
    const allowed = Object.fromEntries(["name", "address", "city", "state", "contactNumber", "timeZone"].filter((key) => req.body[key] !== undefined).map((key) => [key, key === "contactNumber" ? req.body[key].replace(/[\s()-]/g, "") : req.body[key]]));
    await AppDataSource.getRepository(Clinic).update({ id: req.auth.clinicId }, allowed);
    const clinic = await AppDataSource.getRepository(Clinic).findOneBy({ id: req.auth.clinicId });
    return res.json({ clinic });
  } catch (error) { return next(error); }

}

export async function updateClinicSettings(req, res, next) {
  try {
    const hours = req.body.workingHours;
    if (!hours || typeof hours !== "object" || DAYS.some((day) => !hours[day] || typeof hours[day].enabled !== "boolean" || (hours[day].enabled && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hours[day].open) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hours[day].close) || hours[day].open >= hours[day].close)))) return res.status(400).json({ error: "Provide valid opening and closing times for every open day." });
    if ((req.body.breaks || []).some((item) => !item.start || !item.end || item.start >= item.end)) return res.status(400).json({ error: "Break end time must be later than its start time." });
    const repository = AppDataSource.getRepository(ClinicSettings);
    const existing = await getSettings(AppDataSource.manager, req.auth.clinicId);
    Object.assign(existing, cleanSettings(req.body));
    return res.json({ settings: await repository.save(existing) });
  } catch (error) { return next(error); }

}

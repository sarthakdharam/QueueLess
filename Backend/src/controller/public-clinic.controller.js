import { AppDataSource } from "../config/data-source.js";
import { Clinic } from "../entities/Clinic.js";
import { Doctor } from "../entities/Doctor.js";
import { addDays, availableSlots, dateInZone, loadPublicClinic, validDate } from "../services/patient/clinic-availability.js";

export async function searchClinics(req, res, next) {
  try {
    const builder = AppDataSource.getRepository(Clinic).createQueryBuilder("c")
      .innerJoin(Doctor, "d", "d.clinic_id = c.id AND d.status = 'active'")
      .where("c.status = 'active'")
      .select(["c.id AS id", "c.name AS name", "c.address AS address", "c.city AS city", "c.state AS state", "c.contact_number AS contact_number", "c.time_zone AS time_zone"])
      .distinct(true).orderBy("c.name", "ASC").limit(50);
    if (req.query.q) builder.andWhere("(c.name ILIKE :q OR c.city ILIKE :q OR c.address ILIKE :q)", { q: `%${req.query.q}%` });
    if (req.query.city) builder.andWhere("c.city ILIKE :city", { city: `%${req.query.city}%` });
    return res.json({ clinics: await builder.getRawMany() });
  } catch (error) { return next(error); }

}

export async function getClinicDetails(req, res, next) {
  try {
    const result = await loadPublicClinic(req.params.clinicId);
    if (!result) return res.status(404).json({ error: "Clinic not found." });
    const { clinic, settings, doctors } = result;
    return res.json({ clinic: { id: clinic.id, name: clinic.name, address: clinic.address, city: clinic.city, state: clinic.state, contactNumber: clinic.contactNumber, timeZone: clinic.timeZone, workingHours: settings?.workingHours || {} }, doctors: doctors.map(({ id, name, specialization }) => ({ id, name, specialization })), appointmentBookingEnabled: Boolean(settings?.appointmentCapacity && settings?.slotDurationMinutes && doctors.length), walkInsEnabled: Boolean(settings?.walkInsEnabled) });
  } catch (error) { return next(error); }

}

export async function getAvailableSlots(req, res, next) {
  try {
    const result = await loadPublicClinic(req.params.clinicId);
    if (!result) return res.status(404).json({ error: "Clinic not found." });
    const { clinic, settings, doctors } = result;
    const doctor = doctors.find((item) => item.id === req.query.doctorId);
    if (!doctor) return res.status(404).json({ error: "Doctor not found." });
    const today = dateInZone(new Date(), clinic.timeZone || "Asia/Kolkata");
    if (req.query.date < today || req.query.date > addDays(today, 60)) return res.json({ date: req.query.date, slots: [] });
    return res.json({ date: req.query.date, durationMinutes: settings?.slotDurationMinutes || 0, capacity: settings?.appointmentCapacity || 0, slots: await availableSlots({ clinic, settings, doctor, date: req.query.date }) });
  } catch (error) { return next(error); }

}

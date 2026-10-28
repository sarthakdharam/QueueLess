import { AppDataSource } from "../config/data-source.js";
import { Clinic } from "../entities/Clinic.js";
import { ClinicSettings } from "../entities/ClinicSettings.js";
import { Doctor } from "../entities/Doctor.js";

export async function findPublicClinicDetails(clinicId) {
  const clinic = await AppDataSource.getRepository(Clinic).findOneBy({ id: clinicId, status: "active" });
  if (!clinic) return null;
  const [settings, doctors] = await Promise.all([
    AppDataSource.getRepository(ClinicSettings).findOneBy({ clinicId }),
    AppDataSource.getRepository(Doctor).find({
      where: { clinicId, status: "active" },
      select: { id: true, name: true, specialization: true, availability: true },
      order: { createdAt: "ASC" },
    }),
  ]);
  return { clinic, settings, doctors };
}

import { AppDataSource } from "../config/data-source.js";
import { Doctor } from "../entities/Doctor.js";

export async function listDoctors(req, res, next) {
  try {
    const doctors = await AppDataSource.getRepository(Doctor).find({ where: { clinicId: req.auth.clinicId, status: "active" }, order: { createdAt: "ASC" } });
    return res.json({ doctors });
  } catch (error) { return next(error); }

}

export async function createDoctor(req, res, next) {
  try {
    const doctor = await AppDataSource.getRepository(Doctor).save(AppDataSource.getRepository(Doctor).create({ clinicId: req.auth.clinicId, name: req.body.name, specialization: req.body.specialization || null, details: req.body.details || null, availability: req.body.availability || {} }));
    return res.status(201).json({ doctor });
  } catch (error) { return next(error); }

}

export async function updateDoctor(req, res, next) {
  try {
    const repository = AppDataSource.getRepository(Doctor);
    const doctor = await repository.findOneBy({ id: req.params.doctorId, clinicId: req.auth.clinicId, status: "active" });
    if (!doctor) return res.status(404).json({ error: "Doctor not found." });
    for (const field of ["name", "specialization", "details", "availability"]) if (req.body[field] !== undefined) doctor[field] = req.body[field] || null;
    return res.json({ doctor: await repository.save(doctor) });
  } catch (error) { return next(error); }

}

export async function deactivateDoctor(req, res, next) {
  try {
    const result = await AppDataSource.getRepository(Doctor).update({ id: req.params.doctorId, clinicId: req.auth.clinicId, status: "active" }, { status: "inactive" });
    if (!result.affected) return res.status(404).json({ error: "Doctor not found." });
    return res.status(204).end();
  } catch (error) { return next(error); }

}

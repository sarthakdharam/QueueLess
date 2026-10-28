import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/data-source.js";
import { Clinic } from "../entities/Clinic.js";
import { ClinicUser } from "../entities/ClinicUser.js";
import { Subscription } from "../entities/Subscription.js";

function createSession(user, clinic) {
  const token = jwt.sign({ sub: user.id, clinicId: clinic.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "12h" });
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role }, clinic: { id: clinic.id, name: clinic.name } };
}

export async function registerClinic(req, res, next) {
  const { clinicName, address, city, state, contactNumber, email, adminName, password } = req.body;
  const normalizedEmail = email.toLowerCase();
  const clinicRepo = AppDataSource.getRepository(Clinic);
  const userRepo = AppDataSource.getRepository(ClinicUser);

  try {
    const [existingClinic, existingUser] = await Promise.all([
      clinicRepo.findOneBy({ email: normalizedEmail }),
      userRepo.findOneBy({ email: normalizedEmail }),
    ]);
    if (existingClinic || existingUser) return res.status(409).json({ error: "An account with this email already exists." });

    const created = await AppDataSource.transaction(async (manager) => {
      const clinic = await manager.save(Clinic, manager.create(Clinic, {
        name: clinicName, address, city, state, contactNumber: contactNumber.replace(/[\s()-]/g, ""), email: normalizedEmail,
      }));
      const user = await manager.save(ClinicUser, manager.create(ClinicUser, {
        clinicId: clinic.id, name: adminName, email: normalizedEmail,
        passwordHash: await bcrypt.hash(password, 12), role: "administrator",
      }));
      const trialStart = new Date();
      const trialEnd = new Date(trialStart);
      trialEnd.setMonth(trialEnd.getMonth() + 1);
      await manager.save(Subscription, manager.create(Subscription, { clinicId: clinic.id, status: "trial", plan: "base", trialStart, trialEnd }));
      return { clinic, user };
    });
    return res.status(201).json(createSession(created.user, created.clinic));
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "An account with this email already exists." });
    return next(error);
  }

}

export async function loginClinic(req, res, next) {
  try {
    const user = await AppDataSource.getRepository(ClinicUser).findOne({
      where: { email: req.body.email.toLowerCase(), status: "active" },
      select: { id: true, clinicId: true, name: true, email: true, role: true, status: true, passwordHash: true },
    });
    const valid = user && await bcrypt.compare(req.body.password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Email or password is incorrect." });

    const clinic = await AppDataSource.getRepository(Clinic).findOneBy({ id: user.clinicId, status: "active" });
    if (!clinic) return res.status(403).json({ error: "This clinic account is unavailable." });
    return res.json(createSession(user, clinic));
  } catch (error) {
    return next(error);
  }

}

export async function getClinicSession(req, res, next) {
  try {
    const clinic = await AppDataSource.getRepository(Clinic).findOneBy({ id: req.auth.clinicId });
    const user = await AppDataSource.getRepository(ClinicUser).findOneBy({ id: req.auth.sub, clinicId: req.auth.clinicId });
    if (!clinic || !user) return res.status(401).json({ error: "Session is no longer valid." });
    return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, clinic: { id: clinic.id, name: clinic.name } });
  } catch (error) {
    return next(error);
  }

}

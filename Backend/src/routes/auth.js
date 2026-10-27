import { Router } from "express";
import { body, validationResult } from "express-validator";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/data-source.js";
import { Clinic } from "../entities/Clinic.js";
import { ClinicUser } from "../entities/ClinicUser.js";
import { Subscription } from "../entities/Subscription.js";
import { requireAuth } from "../middleware/require-auth.js";

export const authRouter = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many account requests. Please try again later." } });
const emailRule = body("email").trim().isEmail().withMessage("Enter a valid email address.").normalizeEmail();
const passwordRule = body("password").isString().isLength({ min: 10, max: 72 }).withMessage("Password must be 10 to 72 characters.");

function validationError(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });
  return next();
}

function createSession(user, clinic) {
  const token = jwt.sign({ sub: user.id, clinicId: clinic.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "12h" });
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role }, clinic: { id: clinic.id, name: clinic.name } };
}

authRouter.post("/register", authLimiter, [
  body("clinicName").trim().isLength({ min: 2, max: 160 }).withMessage("Clinic name is required."),
  body("address").trim().isLength({ min: 5, max: 1000 }).withMessage("Enter a valid clinic address."),
  body("city").trim().isLength({ min: 2, max: 100 }).withMessage("City is required."),
  body("state").trim().isLength({ min: 2, max: 100 }).withMessage("State is required."),
  body("contactNumber").trim().matches(/^\+?[0-9\s()-]{8,20}$/).withMessage("Enter a valid clinic phone number."),
  emailRule,
  body("adminName").trim().isLength({ min: 2, max: 160 }).withMessage("Administrator name is required."),
  passwordRule,
  body("acceptedTerms").equals("true").withMessage("Accept the terms and privacy policy to continue."),
  validationError,
], async (req, res, next) => {
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
});

authRouter.post("/login", authLimiter, [emailRule, body("password").isString().notEmpty().withMessage("Password is required."), validationError], async (req, res, next) => {
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
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const clinic = await AppDataSource.getRepository(Clinic).findOneBy({ id: req.auth.clinicId });
    const user = await AppDataSource.getRepository(ClinicUser).findOneBy({ id: req.auth.sub, clinicId: req.auth.clinicId });
    if (!clinic || !user) return res.status(401).json({ error: "Session is no longer valid." });
    return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, clinic: { id: clinic.id, name: clinic.name } });
  } catch (error) {
    return next(error);
  }
});

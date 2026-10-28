import { Router } from "express";
import { body, validationResult } from "express-validator";
import { rateLimit } from "express-rate-limit";
import { requireAuth } from "../middleware/require-auth.js";
import { registerClinic, loginClinic, getClinicSession } from "../controller/auth.controller.js";
import { INDIAN_REGIONS } from "../utils/indian-regions.js";

export const authRouter = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many account requests. Please try again later." } });
const emailRule = body("email").trim().isEmail().withMessage("Enter a valid email address.").normalizeEmail();
const passwordRule = body("password").isString().isLength({ min: 8 }).withMessage("Password must be at least 8 characters.").bail().matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s]).+$/).withMessage("Use an uppercase letter, a lowercase letter, a number, and a special character.");

function validationError(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });
  return next();
}

authRouter.post("/register", authLimiter, [
  body("clinicName").trim().isLength({ min: 2, max: 160 }).withMessage("Clinic name is required."),
  body("address").trim().isLength({ min: 5, max: 1000 }).withMessage("Enter a valid clinic address."),
  body("city").trim().isLength({ min: 2, max: 100 }).withMessage("City is required."),
  body("state").trim().isIn([...INDIAN_REGIONS]).withMessage("Choose a valid Indian state or Union Territory."),
  body("contactNumber").trim().matches(/^\+?[0-9\s()-]{8,20}$/).withMessage("Enter a valid clinic phone number."),
  emailRule,
  body("adminName").trim().isLength({ min: 2, max: 160 }).withMessage("Administrator name is required."),
  passwordRule,
  body("acceptedTerms").equals("true").withMessage("Accept the terms and privacy policy to continue."),
  validationError,
], registerClinic);

authRouter.post("/login", authLimiter, [emailRule, body("password").isString().notEmpty().withMessage("Password is required."), validationError], loginClinic);

authRouter.get("/me", requireAuth, getClinicSession);

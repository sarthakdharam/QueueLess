import { randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { AppDataSource } from "../config/data-source.js";
import { Patient } from "../entities/Patient.js";
import { OtpChallenge } from "../entities/OtpChallenge.js";
import { Registration } from "../entities/Registration.js";
import { Clinic } from "../entities/Clinic.js";
import { createAccess } from "../services/patient/access-links.js";
import { normalizeMobile } from "../services/patient/mobile.js";
import { otpHash } from "../services/patient/otp.js";

export async function requestRecoveryCode(req, res, next) {
  const mobile = normalizeMobile(req.body.mobile);
  try {
    const patient = await AppDataSource.getRepository(Patient).findOneBy({ mobile });
    let developmentCode;
    if (patient) {
      const code = String(randomInt(100000, 1000000));
      const id = randomUUID();
      const challenge = AppDataSource.getRepository(OtpChallenge).create({ id, mobile, challengeHash: otpHash(id, code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
      await AppDataSource.getRepository(OtpChallenge).save(challenge);
      if (process.env.NODE_ENV !== "production" && process.env.OTP_DEV_ECHO === "true") developmentCode = code;
    }
    return res.status(202).json({ message: "If registrations exist for that mobile number, a verification code has been sent.", ...(developmentCode ? { developmentCode } : {}) });
  } catch (error) { return next(error); }

}

export async function verifyRecoveryCode(req, res, next) {
  const mobile = normalizeMobile(req.body.mobile);
  try {
    const result = await AppDataSource.transaction(async (manager) => {
      const challenge = await manager.getRepository(OtpChallenge).createQueryBuilder("o").where("o.mobile = :mobile AND o.consumed_at IS NULL AND o.expires_at > now()", { mobile }).orderBy("o.created_at", "DESC").setLock("pessimistic_write").getOne();
      if (!challenge || challenge.attemptCount >= 5) return { error: true };
      challenge.attemptCount += 1;
      const expected = Buffer.from(challenge.challengeHash);
      const provided = Buffer.from(otpHash(challenge.id, req.body.code));
      if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
        await manager.getRepository(OtpChallenge).save(challenge);
        return { error: true };
      }
      challenge.verifiedAt = new Date();
      challenge.consumedAt = new Date();
      await manager.getRepository(OtpChallenge).save(challenge);
      const registrations = await manager.getRepository(Registration).createQueryBuilder("r")
        .innerJoin("patients", "p", "p.id = r.patient_id").where("p.mobile = :mobile AND r.status NOT IN ('cancelled', 'rescheduled')", { mobile })
        .orderBy("r.created_at", "DESC").limit(20).getMany();
      const links = [];
      for (const registration of registrations) {
        const clinic = await manager.getRepository(Clinic).findOneBy({ id: registration.clinicId });
        const access = await createAccess(manager, registration.id);
        links.push({ reference: registration.reference, clinicName: clinic?.name || "Clinic", accessUrl: access.url });
      }
      return { links };
    });
    if (result.error) return res.status(400).json({ error: "The code is invalid or expired." });
    return res.json({ registrations: result.links });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }

}

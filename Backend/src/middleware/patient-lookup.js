import { AppDataSource } from "../config/data-source.js";
import { PatientLookupSession } from "../entities/PatientLookupSession.js";
import { lookupSecretHash } from "../services/patient/lookup-sessions.js";
import { isCredentialActive } from "../services/patient/credential-policy.js";

export async function requirePatientLookup(req, res, next) {
  const secret = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || secret.length < 40 || secret.length > 100) return res.status(401).json({ error: "Your appointment lookup session has expired. Please verify your mobile number again." });
  try {
    const repository = AppDataSource.getRepository(PatientLookupSession);
    const session = await repository.createQueryBuilder("s")
      .where("s.token_hash = :tokenHash AND s.revoked_at IS NULL AND s.expires_at > now()", { tokenHash: lookupSecretHash(secret) }).getOne();
    if (!isCredentialActive(session)) return res.status(401).json({ error: "Your appointment lookup session has expired. Please verify your mobile number again." });
    session.lastAccessedAt = new Date();
    await repository.save(session);
    req.patientLookup = { id: session.id, mobile: session.mobile };
    return next();
  } catch (error) { return next(error); }
}

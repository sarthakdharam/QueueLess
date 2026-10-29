import { AppDataSource } from "../config/data-source.js";
import { PatientAccessToken } from "../entities/PatientAccessToken.js";
import { accessHash } from "../services/patient/access-links.js";
import { isCredentialActive } from "../services/patient/credential-policy.js";

export async function requirePatientAccess(req, res, next) {
  const secret = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || secret.length < 40 || secret.length > 100) return res.status(401).json({ error: "A valid private registration link is required." });
  try {
    const access = await AppDataSource.getRepository(PatientAccessToken).createQueryBuilder("t").where("t.token_hash = :tokenHash AND t.revoked_at IS NULL", { tokenHash: accessHash(secret) }).getOne();
    if (!isCredentialActive(access)) return res.status(401).json({ error: "This private link has expired or was revoked. Recover access using your mobile number." });
    access.lastAccessedAt = new Date();
    await AppDataSource.getRepository(PatientAccessToken).save(access);
    req.patientAccess = { tokenId: access.id, registrationId: access.registrationId };
    return next();
  } catch (error) { return next(error); }
}

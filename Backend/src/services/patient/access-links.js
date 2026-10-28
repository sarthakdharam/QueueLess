import { createHash, randomBytes } from "node:crypto";
import { PatientAccessToken } from "../../entities/PatientAccessToken.js";
import { disconnectPatientSockets } from "../../sockets/socket-server.js";

function accessSecret() {
  return randomBytes(32).toString("base64url");
}

export function accessHash(secret) {
  return createHash("sha256").update(secret).digest("hex");
}

function accessUrl(secret) {
  return `${process.env.APP_BASE_URL || "http://localhost:5173"}/patient/registration#${secret}`;
}

export async function createAccess(manager, registrationId) {
  const repository = manager.getRepository(PatientAccessToken);
  const secret = accessSecret();
  const now = new Date();
  await repository.createQueryBuilder().update(PatientAccessToken)
    .set({ revokedAt: now })
    .where('"registration_id" = :registrationId AND "revoked_at" IS NULL', { registrationId })
    .execute();
  await disconnectPatientSockets(registrationId);
  await repository.save(repository.create({
    registrationId,
    tokenHash: accessHash(secret),
    expiresAt: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
  }));
  return { secret, url: accessUrl(secret) };
}

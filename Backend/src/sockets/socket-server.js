import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/data-source.js";
import { ClinicUser } from "../entities/ClinicUser.js";
import { PatientAccessToken } from "../entities/PatientAccessToken.js";
import { accessHash } from "../services/patient/access-links.js";

let io;

export function initializeSocketServer(server) {
  const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173").split(",").map((origin) => origin.trim()).filter(Boolean);
  io = new Server(server, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
  });

  io.use(async (socket, next) => {
    try {
      const { token, accessToken } = socket.handshake.auth || {};
      if (token) {
        const claims = jwt.verify(token, process.env.JWT_SECRET);
        const user = await AppDataSource.getRepository(ClinicUser).findOneBy({ id: claims.sub, clinicId: claims.clinicId, status: "active" });
        if (!user) return next(new Error("Clinic session is no longer valid."));
        socket.data.clinicId = user.clinicId;
        socket.data.userId = user.id;
        socket.data.role = user.role;
        socket.data.expiresAt = claims.exp ? claims.exp * 1000 : Date.now() + 12 * 60 * 60 * 1000;
        return next();
      }
      if (accessToken && accessToken.length >= 40 && accessToken.length <= 100) {
        const access = await AppDataSource.getRepository(PatientAccessToken).createQueryBuilder("t")
          .innerJoin("registrations", "r", "r.id = t.registration_id")
          .where("t.token_hash = :hash AND t.revoked_at IS NULL AND t.expires_at > now()", { hash: accessHash(accessToken) })
          .select(["t.id AS token_id", "t.registration_id AS registration_id", "r.clinic_id AS clinic_id", "t.expires_at AS expires_at"])
          .getRawOne();
        if (!access) return next(new Error("Patient access link is invalid or expired."));
        socket.data.registrationId = access.registration_id;
        socket.data.clinicId = access.clinic_id;
        socket.data.patientTokenId = access.token_id;
        socket.data.expiresAt = new Date(access.expires_at).getTime();
        return next();
      }
      return next(new Error("Authentication is required."));
    } catch {
      return next(new Error("Authentication is invalid or expired."));
    }
  });

  io.on("connection", (socket) => {
    const expiryTimer = setTimeout(() => socket.disconnect(true), Math.max(0, Math.min(socket.data.expiresAt - Date.now(), 12 * 60 * 60 * 1000)));
    socket.once("disconnect", () => clearTimeout(expiryTimer));
    socket.on("clinic:joinQueue", () => {
      if (socket.data.clinicId) socket.join(`clinic:${socket.data.clinicId}`);
    });
    socket.on("patient:joinQueue", () => {
      if (socket.data.registrationId) socket.join(`patient:${socket.data.registrationId}`);
    });
    socket.on("queue:requestSnapshot", () => {
      socket.emit("queue:snapshot", { refreshRequired: true, emittedAt: new Date().toISOString() });
    });
  });
  return io;
}

export async function disconnectPatientSockets(registrationId) {
  if (!io) return;
  const sockets = await io.in(`patient:${registrationId}`).fetchSockets();
  for (const socket of sockets) socket.disconnect(true);
}

export function emitQueueChange({ clinicId, registrationId, status, type = "queue:updated" }) {
  if (!io) return;
  const event = { clinicId, status, type, changedAt: new Date().toISOString() };
  io.to(`clinic:${clinicId}`).emit(type, event);
  if (registrationId) {
    io.to(`patient:${registrationId}`).emit(type, event);
    io.to(`patient:${registrationId}`).emit("patient:statusChanged", event);
    if (status === "called") io.to(`patient:${registrationId}`).emit("patient:called", event);
  }
}

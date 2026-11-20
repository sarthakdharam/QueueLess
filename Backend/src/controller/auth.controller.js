import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/data-source.js";
import { Clinic } from "../entities/Clinic.js";
import { ClinicUser } from "../entities/ClinicUser.js";
import { RefreshToken } from "../entities/RefreshToken.js";
import { Subscription } from "../entities/Subscription.js";
import {
  createRefreshSecret,
  isRefreshTokenActive,
  parseCookies,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
  refreshTokenHash,
  REFRESH_TOKEN_TTL_MS,
} from "../services/auth/refresh-tokens.js";

const ACCESS_TOKEN_TTL = "15m";

function createAccessSession(user, clinic) {
  const token = jwt.sign(
    { sub: user.id, clinicId: clinic.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL },
  );
  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    clinic: { id: clinic.id, name: clinic.name },
  };
}

async function issueRefreshToken(manager, user, clinic) {
  const secret = createRefreshSecret();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  const token = manager.create(RefreshToken, {
    userId: user.id,
    clinicId: clinic.id,
    tokenHash: refreshTokenHash(secret),
    expiresAt,
  });
  await manager.save(RefreshToken, token);
  return { secret, token };
}

function sendSession(res, session, { status = 200 } = {}) {
  res.cookie(
    REFRESH_COOKIE_NAME,
    session.refreshSecret,
    refreshCookieOptions(),
  );
  return res.status(status).json(session.access);
}

export async function registerClinic(req, res, next) {
  const {
    clinicName,
    address,
    city,
    state,
    contactNumber,
    email,
    adminName,
    password,
  } = req.body;
  const normalizedEmail = email.toLowerCase();
  const clinicRepo = AppDataSource.getRepository(Clinic);
  const userRepo = AppDataSource.getRepository(ClinicUser);

  try {
    const [existingClinic, existingUser] = await Promise.all([
      clinicRepo.findOneBy({ email: normalizedEmail }),
      userRepo.findOneBy({ email: normalizedEmail }),
    ]);
    if (existingClinic || existingUser)
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });

    const created = await AppDataSource.transaction(async (manager) => {
      const clinic = await manager.save(
        Clinic,
        manager.create(Clinic, {
          name: clinicName,
          address,
          city,
          state,
          contactNumber: contactNumber.replace(/[\s()-]/g, ""),
          email: normalizedEmail,
        }),
      );
      const user = await manager.save(
        ClinicUser,
        manager.create(ClinicUser, {
          clinicId: clinic.id,
          name: adminName,
          email: normalizedEmail,
          passwordHash: await bcrypt.hash(password, 12),
          role: "administrator",
        }),
      );
      const trialStart = new Date();
      const trialEnd = new Date(trialStart);
      trialEnd.setMonth(trialEnd.getMonth() + 1);
      await manager.save(
        Subscription,
        manager.create(Subscription, {
          clinicId: clinic.id,
          status: "trial",
          plan: "base",
          trialStart,
          trialEnd,
        }),
      );
      return { clinic, user };
    });
    const refresh = await issueRefreshToken(
      AppDataSource.manager,
      created.user,
      created.clinic,
    );
    return sendSession(
      res,
      {
        access: createAccessSession(created.user, created.clinic),
        refreshSecret: refresh.secret,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error.code === "23505")
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    return next(error);
  }
}

export async function loginClinic(req, res, next) {
  try {
    const user = await AppDataSource.getRepository(ClinicUser).findOne({
      where: { email: req.body.email.toLowerCase(), status: "active" },
      select: {
        id: true,
        clinicId: true,
        name: true,
        email: true,
        role: true,
        status: true,
        passwordHash: true,
      },
    });
    const valid =
      user && (await bcrypt.compare(req.body.password, user.passwordHash));
    if (!valid)
      return res.status(401).json({ error: "Email or password is incorrect." });

    const clinic = await AppDataSource.getRepository(Clinic).findOneBy({
      id: user.clinicId,
      status: "active",
    });
    if (!clinic)
      return res
        .status(403)
        .json({ error: "This clinic account is unavailable." });
    const refresh = await issueRefreshToken(
      AppDataSource.manager,
      user,
      clinic,
    );
    return sendSession(res, {
      access: createAccessSession(user, clinic),
      refreshSecret: refresh.secret,
    });
  } catch (error) {
    return next(error);
  }
}

export async function refreshClinicSession(req, res, next) {
  const secret = parseCookies(req.get("cookie"))[REFRESH_COOKIE_NAME];
  if (!secret)
    return res.status(401).json({ error: "Session refresh is required." });

  try {
    const session = await AppDataSource.transaction(async (manager) => {
      const tokenRepo = manager.getRepository(RefreshToken);
      const existing = await tokenRepo.findOneBy({
        tokenHash: refreshTokenHash(secret),
      });
      if (!existing) return null;

      if (existing.revokedAt) {
        await tokenRepo
          .createQueryBuilder()
          .update()
          .set({ revokedAt: new Date() })
          .where("user_id = :userId AND revoked_at IS NULL", {
            userId: existing.userId,
          })
          .execute();
        return null;
      }
      if (!isRefreshTokenActive(existing)) return null;

      const [user, clinic] = await Promise.all([
        manager.getRepository(ClinicUser).findOneBy({
          id: existing.userId,
          clinicId: existing.clinicId,
          status: "active",
        }),
        manager.getRepository(Clinic).findOneBy({
          id: existing.clinicId,
          status: "active",
        }),
      ]);
      if (!user || !clinic) return null;

      const refresh = await issueRefreshToken(manager, user, clinic);
      const rotation = await tokenRepo
        .createQueryBuilder()
        .update()
        .set({
          revokedAt: new Date(),
          replacedById: refresh.token.id,
          lastUsedAt: new Date(),
        })
        .where("id = :id AND revoked_at IS NULL", { id: existing.id })
        .execute();
      if (!rotation.affected) {
        await tokenRepo.delete(refresh.token.id);
        return null;
      }
      return {
        access: createAccessSession(user, clinic),
        refreshSecret: refresh.secret,
      };
    });
    if (!session)
      return res.status(401).json({ error: "Session is invalid or expired." });
    return sendSession(res, session);
  } catch (error) {
    return next(error);
  }
}

export async function logoutClinic(req, res, next) {
  const secret = parseCookies(req.get("cookie"))[REFRESH_COOKIE_NAME];
  try {
    if (secret) {
      await AppDataSource.getRepository(RefreshToken)
        .createQueryBuilder()
        .update()
        .set({ revokedAt: new Date() })
        .where("token_hash = :tokenHash AND revoked_at IS NULL", {
          tokenHash: refreshTokenHash(secret),
        })
        .execute();
    }
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}

export async function getClinicSession(req, res, next) {
  try {
    const clinic = await AppDataSource.getRepository(Clinic).findOneBy({
      id: req.auth.clinicId,
    });
    const user = await AppDataSource.getRepository(ClinicUser).findOneBy({
      id: req.auth.sub,
      clinicId: req.auth.clinicId,
    });
    if (!clinic || !user)
      return res.status(401).json({ error: "Session is no longer valid." });
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      clinic: { id: clinic.id, name: clinic.name },
    });
  } catch (error) {
    return next(error);
  }
}

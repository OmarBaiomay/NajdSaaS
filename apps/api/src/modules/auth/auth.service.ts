import { randomUUID } from "node:crypto";
import { prisma } from "../../config/db.js";
import { redis } from "../../config/redis.js";
import { hashPassword, comparePassword } from "../../utils/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt.js";
import { ApiError } from "../../utils/ApiError.js";

const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30; // 30d, mirrors JWT_REFRESH_TTL

interface RegisterAgencyInput {
  agencyName: string;
  agencySlug: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

/** Bootstraps a brand-new Agency with its first AGENCY_OWNER user. */
export async function registerAgency(input: RegisterAgencyInput) {
  const existing = await prisma.agency.findUnique({ where: { slug: input.agencySlug } });
  if (existing) throw ApiError.conflict("Agency slug already taken");

  const passwordHash = await hashPassword(input.password);

  const agency = await prisma.agency.create({
    data: {
      name: input.agencyName,
      slug: input.agencySlug,
      status: "TRIAL",
      users: {
        create: {
          email: input.email.toLowerCase(),
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          role: "AGENCY_OWNER",
        },
      },
    },
    include: { users: true },
  });

  return { agency, user: agency.users[0] };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findFirst({ where: { email: email.toLowerCase(), isActive: true } });
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return issueTokens(user.id, user.agencyId, user.tenantId, user.role);
}

export async function issueTokens(userId: string, agencyId: string, tenantId: string | null, role: string) {
  const accessToken = signAccessToken({ sub: userId, agencyId, tenantId, role: role as never });

  const tokenId = randomUUID();
  const refreshToken = signRefreshToken(userId, tokenId);

  // Store a Redis-backed session record for fast revocation/logout, keyed by jti.
  await redis.set(`refresh:${tokenId}`, userId, "EX", REFRESH_TTL_SECONDS);

  return { accessToken, refreshToken, tokenId };
}

export async function refreshSession(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const stillValid = await redis.get(`refresh:${payload.jti}`);
  if (!stillValid) throw ApiError.unauthorized("Session revoked");

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw ApiError.unauthorized("User not found or inactive");

  // Rotate: revoke the old refresh token, issue a new pair.
  await redis.del(`refresh:${payload.jti}`);
  return issueTokens(user.id, user.agencyId, user.tenantId, user.role);
}

export async function logout(refreshToken: string | undefined) {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    await redis.del(`refresh:${payload.jti}`);
  } catch {
    // token already invalid/expired — nothing to revoke
  }
}

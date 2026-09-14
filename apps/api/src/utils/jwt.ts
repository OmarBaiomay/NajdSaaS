import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "@prisma/client";

export interface AccessTokenPayload {
  sub: string; // userId
  agencyId: string;
  tenantId: string | null;
  role: Role;
}

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(userId: string, tokenId: string) {
  return jwt.sign({ sub: userId, jti: tokenId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function verifyRefreshToken(token: string): { sub: string; jti: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; jti: string };
}

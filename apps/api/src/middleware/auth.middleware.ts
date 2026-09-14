import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { verifyAccessToken } from "../utils/jwt.js";
import { ApiError } from "../utils/ApiError.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        agencyId: string;
        tenantId: string | null;
        role: Role;
      };
    }
  }
}

/** Verifies the access token (from httpOnly cookie or Authorization header) and attaches req.auth. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : undefined;
  const token = req.cookies?.access_token ?? bearer;

  if (!token) return next(ApiError.unauthorized("Missing access token"));

  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      agencyId: payload.agencyId,
      tenantId: payload.tenantId,
      role: payload.role,
    };
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired access token"));
  }
}

import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";

/** Restricts a route to a set of roles. Call after requireAuth. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(ApiError.unauthorized());
    if (!roles.includes(req.auth.role)) {
      return next(ApiError.forbidden(`Requires one of: ${roles.join(", ")}`));
    }
    next();
  };
}

export const isSuperAdmin = requireRole("SUPER_ADMIN");
export const isAgencyLevel = requireRole("SUPER_ADMIN", "AGENCY_OWNER", "AGENCY_STAFF");
export const isTenantLevel = requireRole("TENANT_OWNER", "TENANT_MEMBER");

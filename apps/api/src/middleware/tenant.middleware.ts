import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";

/**
 * A tenant-scoped user (TENANT_OWNER/TENANT_MEMBER) may only act within
 * their own tenant. Agency-level roles may optionally target any tenant
 * under their agency via an `x-tenant-id` header or `:tenantId` param;
 * that value still gets validated against agencyId in the service layer.
 */
export function resolveTenantScope(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) return next(ApiError.unauthorized());

  const requested = (req.params.tenantId as string | undefined) ?? (req.headers["x-tenant-id"] as string | undefined);

  if (req.auth.role === "TENANT_OWNER" || req.auth.role === "TENANT_MEMBER") {
    if (requested && requested !== req.auth.tenantId) {
      return next(ApiError.forbidden("Cannot access another tenant"));
    }
    req.tenantScopeId = req.auth.tenantId;
  } else {
    req.tenantScopeId = requested ?? null;
  }

  next();
}

declare global {
  namespace Express {
    interface Request {
      tenantScopeId?: string | null;
    }
  }
}

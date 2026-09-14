import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createTenantSchema } from "./tenant.validation.js";
import * as tenantService from "./tenant.service.js";
import { ApiError } from "../../utils/ApiError.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const tenants = await tenantService.listTenants(req.auth!.agencyId);
  res.json({ tenants });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = createTenantSchema.parse(req.body);
  const tenant = await tenantService.createTenant(req.auth!.agencyId, input);
  res.status(201).json({ tenant });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.tenantId;
  if (!id) throw ApiError.badRequest("tenantId is required");
  const tenant = await tenantService.getTenant(req.auth!.agencyId, id);
  res.json({ tenant });
});

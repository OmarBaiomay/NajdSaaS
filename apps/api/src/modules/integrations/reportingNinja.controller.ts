import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  saveKeySchema,
  queryProxySchema,
  connectionsProxySchema,
  fieldsProxySchema,
  integrationDetailProxySchema,
} from "./reportingNinja.validation.js";
import * as service from "./reportingNinja.service.js";

function requireTenantId(req: Request): string {
  if (!req.tenantScopeId) {
    throw ApiError.badRequest("A tenant must be specified (x-tenant-id) or you must be a tenant user", "TENANT_REQUIRED");
  }
  return req.tenantScopeId;
}

export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const status = await service.getStatus(req.auth!.agencyId, tenantId);
  res.json({ integration: status });
});

export const saveKey = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const { apiKey } = saveKeySchema.parse(req.body);
  const result = await service.saveAndTestKey(req.auth!.agencyId, tenantId, req.auth!.userId, apiKey);
  res.status(201).json({ integration: result });
});

export const testConnection = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const result = await service.testConnection(req.auth!.agencyId, tenantId);
  res.json({ integration: result });
});

export const disconnect = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  await service.disconnect(req.auth!.agencyId, tenantId);
  res.json({ ok: true });
});

export const listIntegrations = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const data = await service.proxyRequest(req.auth!.agencyId, tenantId, "/integrations", {});
  res.json({ data });
});

export const getIntegrationDetail = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const input = integrationDetailProxySchema.parse(req.body);
  const data = await service.proxyRequest(req.auth!.agencyId, tenantId, "/integrations/detail", input);
  res.json({ data });
});

export const listConnections = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const input = connectionsProxySchema.parse(req.body);
  const data = await service.proxyRequest(req.auth!.agencyId, tenantId, "/connections", input);
  res.json({ data });
});

export const listFields = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const input = fieldsProxySchema.parse(req.body);
  const data = await service.proxyRequest(req.auth!.agencyId, tenantId, "/fields", input);
  res.json({ data });
});

export const runQuery = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const input = queryProxySchema.parse(req.body);
  const data = await service.proxyRequest(req.auth!.agencyId, tenantId, "/query", input);
  res.json({ data });
});

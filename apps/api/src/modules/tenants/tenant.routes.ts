import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { isAgencyLevel } from "../../middleware/rbac.middleware.js";
import { resolveTenantScope } from "../../middleware/tenant.middleware.js";
import * as tenantController from "./tenant.controller.js";

export const tenantRouter = Router();

// Only agency-level roles manage tenants (creating/listing sub-accounts).
tenantRouter.use(requireAuth, isAgencyLevel);

tenantRouter.get("/", tenantController.list);
tenantRouter.post("/", tenantController.create);
tenantRouter.get("/:tenantId", resolveTenantScope, tenantController.getOne);

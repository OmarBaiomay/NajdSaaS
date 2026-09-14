import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { resolveTenantScope } from "../../middleware/tenant.middleware.js";
import * as controller from "./reportingNinja.controller.js";

// Reporting Ninja allows 300 req/min per key. Rendering "all metrics" for one
// integration now fans out into several /query calls (metrics are batched to
// dodge provider-side "field combination not allowed" errors), so this stays
// generous while still protecting the shared per-tenant key from a runaway tab.
const queryLimiter = rateLimit({ windowMs: 60 * 1000, limit: 180, standardHeaders: true, legacyHeaders: false });

export const reportingNinjaRouter = Router();

reportingNinjaRouter.use(requireAuth, resolveTenantScope);

reportingNinjaRouter.get("/status", controller.getStatus);
reportingNinjaRouter.post("/key", controller.saveKey);
reportingNinjaRouter.post("/test", controller.testConnection);
reportingNinjaRouter.delete("/key", controller.disconnect);

reportingNinjaRouter.post("/integrations", queryLimiter, controller.listIntegrations);
reportingNinjaRouter.post("/integrations/detail", queryLimiter, controller.getIntegrationDetail);
reportingNinjaRouter.post("/connections", queryLimiter, controller.listConnections);
reportingNinjaRouter.post("/fields", queryLimiter, controller.listFields);
reportingNinjaRouter.post("/query", queryLimiter, controller.runQuery);

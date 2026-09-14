import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { resolveTenantScope } from "../../middleware/tenant.middleware.js";
import * as controller from "./reportingNinja.controller.js";

// Reporting Ninja allows 300 req/min per key; keep our own users well under
// that per-tenant so one dashboard tab can't exhaust the shared limit.
const queryLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });

export const reportingNinjaRouter = Router();

reportingNinjaRouter.use(requireAuth, resolveTenantScope);

reportingNinjaRouter.get("/status", controller.getStatus);
reportingNinjaRouter.post("/key", controller.saveKey);
reportingNinjaRouter.post("/test", controller.testConnection);
reportingNinjaRouter.delete("/key", controller.disconnect);

reportingNinjaRouter.post("/integrations", queryLimiter, controller.listIntegrations);
reportingNinjaRouter.post("/connections", queryLimiter, controller.listConnections);
reportingNinjaRouter.post("/fields", queryLimiter, controller.listFields);
reportingNinjaRouter.post("/query", queryLimiter, controller.runQuery);

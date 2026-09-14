import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { isSuperAdmin, requireRole } from "../../middleware/rbac.middleware.js";
import * as agencyController from "./agency.controller.js";

export const agencyRouter = Router();

agencyRouter.use(requireAuth);
agencyRouter.get("/me", agencyController.getMine);
agencyRouter.patch("/me", requireRole("SUPER_ADMIN", "AGENCY_OWNER"), agencyController.updateMine);
agencyRouter.get("/", isSuperAdmin, agencyController.listAll);

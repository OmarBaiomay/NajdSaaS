import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { resolveTenantScope } from "../../middleware/tenant.middleware.js";
import * as userController from "./user.controller.js";

export const userRouter = Router();

userRouter.use(requireAuth, resolveTenantScope);

userRouter.get("/", userController.list);
userRouter.get("/creatable-roles", userController.creatableRoles);

// Only TENANT_MEMBER is excluded — everyone else manages users within their scope.
const canManageUsers = requireRole("SUPER_ADMIN", "AGENCY_OWNER", "AGENCY_STAFF", "TENANT_OWNER");
userRouter.post("/", canManageUsers, userController.create);
userRouter.patch("/:userId", canManageUsers, userController.update);

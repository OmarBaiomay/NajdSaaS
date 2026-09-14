import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { resolveTenantScope } from "../../middleware/tenant.middleware.js";
import * as userController from "./user.controller.js";

export const userRouter = Router();

userRouter.use(requireAuth, resolveTenantScope);
userRouter.get("/", userController.list);

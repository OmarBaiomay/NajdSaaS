import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "./auth.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

export const authRouter = Router();

authRouter.post("/register", authLimiter, authController.register);
authRouter.post("/login", authLimiter, authController.login);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", requireAuth, authController.me);

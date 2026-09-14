import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { registerSchema, loginSchema } from "./auth.validation.js";
import * as authService from "./auth.service.js";
import { isProd, env } from "../../config/env.js";

const ACCESS_COOKIE_MS = 15 * 60 * 1000; // 15m
const REFRESH_COOKIE_MS = 30 * 24 * 60 * 60 * 1000; // 30d

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const shared = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    domain: env.COOKIE_DOMAIN,
  };
  res.cookie("access_token", accessToken, { ...shared, maxAge: ACCESS_COOKIE_MS });
  res.cookie("refresh_token", refreshToken, { ...shared, maxAge: REFRESH_COOKIE_MS, path: "/api/auth" });
}

function clearAuthCookies(res: Response) {
  res.clearCookie("access_token", { domain: env.COOKIE_DOMAIN });
  res.clearCookie("refresh_token", { domain: env.COOKIE_DOMAIN, path: "/api/auth" });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const { agency, user } = await authService.registerAgency(input);
  const { accessToken, refreshToken } = await authService.issueTokens(
    user.id,
    user.agencyId,
    user.tenantId,
    user.role
  );
  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({
    agency: { id: agency.id, name: agency.name, slug: agency.slug },
    user: { id: user.id, email: user.email, role: user.role },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const { accessToken, refreshToken } = await authService.login(input.email, input.password);
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ ok: true });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refresh_token;
  const { accessToken, refreshToken } = await authService.refreshSession(token);
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ ok: true });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.cookies?.refresh_token);
  clearAuthCookies(res);
  res.json({ ok: true });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ auth: req.auth });
});

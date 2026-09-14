import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as userService from "./user.service.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const users = await userService.listUsers(req.auth!.agencyId, req.tenantScopeId ?? null);
  res.json({ users });
});

import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createUserSchema, updateUserSchema } from "./user.validation.js";
import * as userService from "./user.service.js";

function actorFrom(req: Request) {
  return {
    userId: req.auth!.userId,
    agencyId: req.auth!.agencyId,
    tenantId: req.auth!.tenantId,
    role: req.auth!.role,
  };
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const users = await userService.listUsers(req.auth!.agencyId, req.tenantScopeId ?? null);
  res.json({ users });
});

export const creatableRoles = asyncHandler(async (req: Request, res: Response) => {
  res.json({ roles: userService.creatableRolesFor(req.auth!.role) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = createUserSchema.parse(req.body);
  const user = await userService.createUser(actorFrom(req), input);
  res.status(201).json({ user });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const input = updateUserSchema.parse(req.body);
  const user = await userService.updateUser(actorFrom(req), req.params.userId!, input);
  res.json({ user });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await userService.deleteUser(actorFrom(req), req.params.userId!);
  res.json({ ok: true });
});

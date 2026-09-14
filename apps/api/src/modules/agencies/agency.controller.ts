import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { updateAgencySchema } from "./agency.validation.js";
import * as agencyService from "./agency.service.js";

export const getMine = asyncHandler(async (req: Request, res: Response) => {
  const agency = await agencyService.getMyAgency(req.auth!.agencyId);
  res.json({ agency });
});

export const updateMine = asyncHandler(async (req: Request, res: Response) => {
  const input = updateAgencySchema.parse(req.body);
  const agency = await agencyService.updateMyAgency(req.auth!.agencyId, input);
  res.json({ agency });
});

export const listAll = asyncHandler(async (_req: Request, res: Response) => {
  const agencies = await agencyService.listAllAgencies();
  res.json({ agencies });
});

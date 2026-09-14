import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as agencyService from "./agency.service.js";

export const getMine = asyncHandler(async (req: Request, res: Response) => {
  const agency = await agencyService.getMyAgency(req.auth!.agencyId);
  res.json({ agency });
});

export const listAll = asyncHandler(async (_req: Request, res: Response) => {
  const agencies = await agencyService.listAllAgencies();
  res.json({ agencies });
});

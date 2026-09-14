import { z } from "zod";

export const updateAgencySchema = z.object({
  name: z.string().min(2).max(120).optional(),
  locale: z.enum(["en", "ar"]).optional(),
});

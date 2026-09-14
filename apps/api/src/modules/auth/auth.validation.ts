import { z } from "zod";

export const registerSchema = z.object({
  agencyName: z.string().min(2).max(120),
  agencySlug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().max(60).optional(),
  lastName: z.string().max(60).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

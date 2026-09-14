import { z } from "zod";

// AGENCY_OWNER/SUPER_ADMIN are never created or reassigned through this API —
// those are provisioned at agency registration time only.
const ASSIGNABLE_ROLES = ["AGENCY_STAFF", "TENANT_OWNER", "TENANT_MEMBER"] as const;

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().max(60).optional(),
  lastName: z.string().max(60).optional(),
  role: z.enum(ASSIGNABLE_ROLES),
  tenantId: z.string().min(1).optional(),
});

export const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(ASSIGNABLE_ROLES).optional(),
  firstName: z.string().max(60).optional(),
  lastName: z.string().max(60).optional(),
});

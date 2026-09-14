import type { Role } from "@prisma/client";
import { prisma } from "../../config/db.js";
import { hashPassword } from "../../utils/password.js";
import { ApiError } from "../../utils/ApiError.js";

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  tenantId: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

const CREATABLE_ROLES: Partial<Record<Role, Role[]>> = {
  SUPER_ADMIN: ["AGENCY_STAFF", "TENANT_OWNER", "TENANT_MEMBER"],
  AGENCY_OWNER: ["AGENCY_STAFF", "TENANT_OWNER", "TENANT_MEMBER"],
  AGENCY_STAFF: ["AGENCY_STAFF", "TENANT_OWNER", "TENANT_MEMBER"],
  TENANT_OWNER: ["TENANT_MEMBER"],
};

export function creatableRolesFor(actorRole: Role): Role[] {
  return CREATABLE_ROLES[actorRole] ?? [];
}

interface Actor {
  userId: string;
  agencyId: string;
  tenantId: string | null;
  role: Role;
}

export async function listUsers(agencyId: string, tenantId: string | null) {
  return prisma.user.findMany({
    where: { agencyId, ...(tenantId ? { tenantId } : {}) },
    select: USER_SELECT,
    orderBy: { createdAt: "desc" },
  });
}

export async function createUser(
  actor: Actor,
  input: { email: string; password: string; firstName?: string; lastName?: string; role: Role; tenantId?: string }
) {
  const allowed = creatableRolesFor(actor.role);
  if (!allowed.includes(input.role)) {
    throw ApiError.forbidden(`You cannot create a user with role ${input.role}`);
  }

  let targetTenantId: string | null = null;
  if (input.role === "TENANT_OWNER" || input.role === "TENANT_MEMBER") {
    if (actor.role === "TENANT_OWNER") {
      targetTenantId = actor.tenantId;
    } else {
      if (!input.tenantId) throw ApiError.badRequest("tenantId is required for this role", "TENANT_REQUIRED");
      const tenant = await prisma.tenant.findFirst({ where: { id: input.tenantId, agencyId: actor.agencyId } });
      if (!tenant) throw ApiError.notFound("Tenant not found");
      targetTenantId = tenant.id;
    }
  }

  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { agencyId_email: { agencyId: actor.agencyId, email } } });
  if (existing) throw ApiError.conflict("A user with this email already exists in your agency");

  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      agencyId: actor.agencyId,
      tenantId: targetTenantId,
      email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
    },
    select: USER_SELECT,
  });
}

export async function updateUser(
  actor: Actor,
  targetUserId: string,
  patch: { isActive?: boolean; role?: Role; firstName?: string; lastName?: string }
) {
  const target = await prisma.user.findFirst({ where: { id: targetUserId, agencyId: actor.agencyId } });
  if (!target) throw ApiError.notFound("User not found");

  if (actor.role === "TENANT_OWNER" && target.tenantId !== actor.tenantId) {
    throw ApiError.forbidden("Cannot manage a user outside your tenant");
  }

  if (target.id === actor.userId && patch.isActive === false) {
    throw ApiError.badRequest("You cannot deactivate your own account", "CANNOT_SELF_DEACTIVATE");
  }

  if (patch.role) {
    if (target.role === "AGENCY_OWNER" || target.role === "SUPER_ADMIN") {
      throw ApiError.forbidden("Cannot change this user's role");
    }
    const allowed = creatableRolesFor(actor.role);
    if (!allowed.includes(patch.role)) throw ApiError.forbidden(`You cannot assign role ${patch.role}`);
  }

  return prisma.user.update({ where: { id: target.id }, data: patch, select: USER_SELECT });
}

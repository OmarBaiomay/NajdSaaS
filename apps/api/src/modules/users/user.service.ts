import { prisma } from "../../config/db.js";

export async function listUsers(agencyId: string, tenantId: string | null) {
  return prisma.user.findMany({
    where: { agencyId, ...(tenantId ? { tenantId } : {}) },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      tenantId: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

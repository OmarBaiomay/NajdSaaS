import { prisma } from "../../config/db.js";
import { ApiError } from "../../utils/ApiError.js";

export async function listTenants(agencyId: string) {
  return prisma.tenant.findMany({ where: { agencyId }, orderBy: { createdAt: "desc" } });
}

export async function createTenant(agencyId: string, data: { name: string; slug: string; locale: string }) {
  const existing = await prisma.tenant.findUnique({ where: { agencyId_slug: { agencyId, slug: data.slug } } });
  if (existing) throw ApiError.conflict("A tenant with this slug already exists in your agency");

  return prisma.tenant.create({ data: { ...data, agencyId } });
}

export async function getTenant(agencyId: string, tenantId: string) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, agencyId } });
  if (!tenant) throw ApiError.notFound("Tenant not found");
  return tenant;
}

import { prisma } from "../../config/db.js";
import { ApiError } from "../../utils/ApiError.js";

export async function getMyAgency(agencyId: string) {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    include: { _count: { select: { tenants: true, users: true } } },
  });
  if (!agency) throw ApiError.notFound("Agency not found");
  return agency;
}

export async function updateMyAgency(agencyId: string, patch: { name?: string; locale?: string }) {
  return prisma.agency.update({
    where: { id: agencyId },
    data: patch,
    include: { _count: { select: { tenants: true, users: true } } },
  });
}

/** SUPER_ADMIN only: list every agency on the platform. */
export async function listAllAgencies() {
  return prisma.agency.findMany({
    include: { _count: { select: { tenants: true, users: true } } },
    orderBy: { createdAt: "desc" },
  });
}

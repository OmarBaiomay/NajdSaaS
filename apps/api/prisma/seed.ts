import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "123456";
const AGENCY_OWNER_EMAIL = "agancy@najd.com";
const TENANT_OWNER_EMAIL = "tenant@najd.com";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const agency = await prisma.agency.upsert({
    where: { slug: "najd-demo" },
    update: {},
    create: {
      name: "Najd Demo Agency",
      slug: "najd-demo",
      status: "ACTIVE",
      locale: "en",
    },
  });

  // Matched by role within the agency (not by email) so re-running this
  // seed after changing the demo email/password updates the existing user
  // in place instead of creating a duplicate.
  const existingOwner = await prisma.user.findFirst({ where: { agencyId: agency.id, role: "AGENCY_OWNER" } });
  const agencyOwner = existingOwner
    ? await prisma.user.update({
        where: { id: existingOwner.id },
        data: { email: AGENCY_OWNER_EMAIL, passwordHash },
      })
    : await prisma.user.create({
        data: {
          agencyId: agency.id,
          email: AGENCY_OWNER_EMAIL,
          passwordHash,
          firstName: "Sara",
          lastName: "Al-Ghamdi",
          role: "AGENCY_OWNER",
        },
      });

  const tenant = await prisma.tenant.upsert({
    where: { agencyId_slug: { agencyId: agency.id, slug: "acme" } },
    update: {},
    create: {
      agencyId: agency.id,
      name: "Acme Marketing Co.",
      slug: "acme",
      status: "ACTIVE",
      locale: "en",
    },
  });

  const existingTenantOwner = await prisma.user.findFirst({
    where: { agencyId: agency.id, tenantId: tenant.id, role: "TENANT_OWNER" },
  });
  const tenantOwner = existingTenantOwner
    ? await prisma.user.update({
        where: { id: existingTenantOwner.id },
        data: { email: TENANT_OWNER_EMAIL, passwordHash },
      })
    : await prisma.user.create({
        data: {
          agencyId: agency.id,
          tenantId: tenant.id,
          email: TENANT_OWNER_EMAIL,
          passwordHash,
          firstName: "Khaled",
          lastName: "Youssef",
          role: "TENANT_OWNER",
        },
      });

  console.log("\nSeed complete:\n");
  console.log(`Agency:        ${agency.name} (${agency.slug})`);
  console.log(`Agency owner:  ${agencyOwner.email} / ${DEMO_PASSWORD}`);
  console.log(`Tenant:        ${tenant.name} (${tenant.slug})`);
  console.log(`Tenant owner:  ${tenantOwner.email} / ${DEMO_PASSWORD}\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

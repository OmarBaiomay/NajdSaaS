import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Demo1234!";

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

  const agencyOwner = await prisma.user.upsert({
    where: { agencyId_email: { agencyId: agency.id, email: "owner@najd-demo.test" } },
    update: {},
    create: {
      agencyId: agency.id,
      email: "owner@najd-demo.test",
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

  const tenantOwner = await prisma.user.upsert({
    where: { agencyId_email: { agencyId: agency.id, email: "admin@acme-demo.test" } },
    update: {},
    create: {
      agencyId: agency.id,
      tenantId: tenant.id,
      email: "admin@acme-demo.test",
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

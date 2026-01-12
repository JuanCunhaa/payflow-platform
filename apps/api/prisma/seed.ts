import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({});

async function main() {
  console.log("Starting database seed...");

  // Clear existing data
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // Create sample tenants
  const tenant1 = await prisma.tenant.create({
    data: {
      name: "Escola São Paulo",
      slug: "escola-sao-paulo",
      schoolCode: "ESP001",
      status: "ACTIVE",
    },
  });

  const tenant2 = await prisma.tenant.create({
    data: {
      name: "Colégio Rio de Janeiro",
      slug: "colegio-rio",
      schoolCode: "CRJ002",
      status: "ACTIVE",
    },
  });

  // Create sample users (emails lowercased)
  const admin = await prisma.user.create({
    data: {
      email: "admin@payflow.com".toLowerCase(),
      name: "Admin PayFlow",
      passwordHash: "hashed_password_admin",
      type: "PLATFORM",
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  const schoolAdmin = await prisma.user.create({
    data: {
      email: "diretor@escolasaopaulo.com".toLowerCase(),
      name: "Maria Diretora",
      passwordHash: "hashed_password_school",
      type: "STAFF",
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  const guardian = await prisma.user.create({
    data: {
      email: "pai@example.com".toLowerCase(),
      name: "João Pai",
      passwordHash: "hashed_password_guardian",
      type: "GUARDIAN",
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  // Create memberships
  await prisma.membership.create({
    data: {
      userId: schoolAdmin.id,
      tenantId: tenant1.id,
      role: "SCHOOL_ADMIN",
    },
  });

  await prisma.membership.create({
    data: {
      userId: guardian.id,
      tenantId: tenant1.id,
      role: "GUARDIAN",
    },
  });

  await prisma.membership.create({
    data: {
      userId: guardian.id,
      tenantId: tenant2.id,
      role: "GUARDIAN",
    },
  });

  // Optional: platform admin membership to tenant1
  await prisma.membership.create({
    data: {
      userId: admin.id,
      tenantId: tenant1.id,
      role: "PLATFORM_ADMIN",
    },
  });

  console.log(`✓ Created ${tenant1.name} (tenant)`);
  console.log(`✓ Created ${tenant2.name} (tenant)`);
  console.log(`✓ Created ${admin.name} (platform)`);
  console.log(`✓ Created ${schoolAdmin.name} (staff)`);
  console.log(`✓ Created ${guardian.name} (guardian)`);
  console.log("✓ Created memberships");
  console.log("✓ Database seeded successfully");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seeding error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient({});

async function hashPassword(plain: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

async function main() {
  console.log("Starting idempotent seed...");

  // Desired data
  const tenants = [
    { name: "Vidal", slug: "vidal", schoolCode: "VIDAL-0001" },
    { name: "Alpha", slug: "alpha", schoolCode: "ALPHA-0001" },
  ];

  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || "Admin@12345";
  const passwordHash = await hashPassword(defaultPassword);

  // Upsert tenants
  const upsertedTenants = await Promise.all(
    tenants.map((t) =>
      prisma.tenant.upsert({
        where: { slug: t.slug },
        update: { name: t.name, schoolCode: t.schoolCode, status: "ACTIVE" },
        create: { name: t.name, slug: t.slug, schoolCode: t.schoolCode, status: "ACTIVE" },
      })
    )
  );

  const [tenantVidal, tenantAlpha] = upsertedTenants;

  // Users (emails normalized)
  const platformEmail = "platform.admin@payflow.com".toLowerCase();
  const vidalAdminEmail = "admin@vidal.com".toLowerCase();
  const alphaAdminEmail = "admin@alpha.com".toLowerCase();

  const platform = await prisma.user.upsert({
    where: { email: platformEmail },
    update: {
      name: "Platform Admin",
      passwordHash,
      type: "PLATFORM",
      status: "ACTIVE",
      emailVerified: true,
    },
    create: {
      email: platformEmail,
      name: "Platform Admin",
      passwordHash,
      type: "PLATFORM",
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  const vidalAdmin = await prisma.user.upsert({
    where: { email: vidalAdminEmail },
    update: {
      name: "Vidal Admin",
      passwordHash,
      type: "STAFF",
      status: "ACTIVE",
      emailVerified: true,
    },
    create: {
      email: vidalAdminEmail,
      name: "Vidal Admin",
      passwordHash,
      type: "STAFF",
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  const alphaAdmin = await prisma.user.upsert({
    where: { email: alphaAdminEmail },
    update: {
      name: "Alpha Admin",
      passwordHash,
      type: "STAFF",
      status: "ACTIVE",
      emailVerified: true,
    },
    create: {
      email: alphaAdminEmail,
      name: "Alpha Admin",
      passwordHash,
      type: "STAFF",
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  // Memberships (upsert by composite unique)
  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: platform.id, tenantId: tenantVidal.id } },
    update: { role: "PLATFORM_ADMIN" },
    create: { userId: platform.id, tenantId: tenantVidal.id, role: "PLATFORM_ADMIN" },
  });
  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: platform.id, tenantId: tenantAlpha.id } },
    update: { role: "PLATFORM_ADMIN" },
    create: { userId: platform.id, tenantId: tenantAlpha.id, role: "PLATFORM_ADMIN" },
  });

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: vidalAdmin.id, tenantId: tenantVidal.id } },
    update: { role: "SCHOOL_ADMIN" },
    create: { userId: vidalAdmin.id, tenantId: tenantVidal.id, role: "SCHOOL_ADMIN" },
  });
  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: alphaAdmin.id, tenantId: tenantAlpha.id } },
    update: { role: "SCHOOL_ADMIN" },
    create: { userId: alphaAdmin.id, tenantId: tenantAlpha.id, role: "SCHOOL_ADMIN" },
  });

  console.log("✓ Seed ok");
  console.log("Logins:");
  console.log(`  PLATFORM -> ${platformEmail} / ${defaultPassword}`);
  console.log(`  VIDAL    -> ${vidalAdminEmail} / ${defaultPassword}`);
  console.log(`  ALPHA    -> ${alphaAdminEmail} / ${defaultPassword}`);
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


const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tenants = await prisma.tenant.findMany({
        select: {
            name: true,
            slug: true,
            schoolCode: true,
            status: true,
        },
    });
    console.log('Tenants list:');
    console.table(tenants);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

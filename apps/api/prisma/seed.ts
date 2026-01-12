import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({});

async function main() {
  console.log('Starting database seed...');

  // Clear existing data
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Create sample users
  const user1 = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice Silva',
      password: 'hashed_password_1', // In production, use bcrypt
      accounts: {
        create: [
          {
            name: 'Conta Corrente',
            type: 'checking',
            balance: 1500.5,
          },
          {
            name: 'Poupança',
            type: 'savings',
            balance: 5000.0,
          },
        ],
      },
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob Santos',
      password: 'hashed_password_2',
      accounts: {
        create: [
          {
            name: 'Conta Principal',
            type: 'checking',
            balance: 2500.75,
          },
        ],
      },
    },
  });

  console.log(`✓ Created ${user1.name} with accounts`);
  console.log(`✓ Created ${user2.name} with accounts`);
  console.log('✓ Database seeded successfully');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seeding error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

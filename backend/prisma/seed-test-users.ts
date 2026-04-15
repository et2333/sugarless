import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const demoPass = await bcrypt.hash('Demo123456!', 10);
  const merchantPass = await bcrypt.hash('Merchant123456!', 10);

  await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: { passwordHash: demoPass, role: 'user', emailVerified: true },
    create: { email: 'demo@example.com', passwordHash: demoPass, role: 'user', emailVerified: true },
  });

  await prisma.user.upsert({
    where: { email: 'merchant@example.com' },
    update: { passwordHash: merchantPass, role: 'merchant', emailVerified: true },
    create: { email: 'merchant@example.com', passwordHash: merchantPass, role: 'merchant', emailVerified: true },
  });

  console.log('Test users ensured: demo@example.com and merchant@example.com');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });


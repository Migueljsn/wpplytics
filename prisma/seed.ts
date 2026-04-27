import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const client = await prisma.client.upsert({
    where: { slug: 'fonil' },
    update: {},
    create: { name: 'Fonil', slug: 'fonil', sector: 'Comercial' },
  });
  console.log('Client:', client.id, client.name);

  const instance = await prisma.waInstance.upsert({
    where: { evolutionName: 'WHATSAPP-BAILEYS' },
    update: {},
    create: { clientId: client.id, label: 'Principal', evolutionName: 'WHATSAPP-BAILEYS', status: 'PENDING' },
  });
  console.log('Instance:', instance.id, instance.evolutionName);

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@wpplytics.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'wpplytics2026';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, hashedPassword, name: 'Admin' },
  });
  console.log('Admin:', admin.id, admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

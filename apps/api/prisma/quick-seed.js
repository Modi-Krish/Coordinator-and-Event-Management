const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = [
    { email: 'admin@test.com', name: 'Test Admin', roles: ['ADMIN'], designations: ['MANAGER'] },
    { email: 'faculty@test.com', name: 'Test Faculty', roles: ['SUPERVISOR'], designations: ['FACULTY'] },
    { email: 'intern@test.com', name: 'Test Intern', roles: ['STAFF'], designations: ['INTERN'] },
    { email: 'coordinator@test.com', name: 'Test Coordinator', roles: ['STAFF'], designations: ['COORDINATOR'] }
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { roles: u.roles, designations: u.designations },
      create: { ...u, passwordHash }
    });
    console.log('Upserted ' + u.email);
  }
}

seed().catch(console.error).finally(() => prisma.$disconnect());

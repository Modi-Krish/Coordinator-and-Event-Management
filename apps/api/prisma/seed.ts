import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with new Civic Domain Model...');
  
  // Clean up existing data to prevent unique constraint errors during re-seeding
  await prisma.userRelationship.deleteMany();
  await prisma.user.deleteMany();
  await prisma.ward.deleteMany();
  await prisma.city.deleteMany();
  await prisma.organization.deleteMany();
  
  const org = await prisma.organization.create({
    data: { name: 'Main Campus', code: 'MAIN' }
  });

  const city = await prisma.city.create({
    data: { name: 'Metropolis' }
  });

  const ward1 = await prisma.ward.create({
    data: { cityId: city.id, wardNumber: 'W-01', name: 'Downtown' }
  });

  const ward2 = await prisma.ward.create({
    data: { cityId: city.id, wardNumber: 'W-02', name: 'Northside' }
  });

  const hashPassword = await bcrypt.hash('password123', 10);

  // Create Users
  const admin = await prisma.user.create({
    data: { name: 'System Admin', email: 'admin@example.com', passwordHash: hashPassword, role: Role.ADMIN, status: UserStatus.ONLINE }
  });

  const supervisor = await prisma.user.create({
    data: { name: 'Area Supervisor', email: 'supervisor@example.com', passwordHash: hashPassword, role: Role.SUPERVISOR, status: UserStatus.OFFLINE }
  });

  const staff = await prisma.user.create({
    data: { name: 'Field Staff', email: 'staff@example.com', passwordHash: hashPassword, role: Role.STAFF, status: UserStatus.OFFLINE }
  });

  const citizen = await prisma.user.create({
    data: { name: 'Jane Citizen', email: 'citizen@example.com', passwordHash: hashPassword, role: Role.CITIZEN, status: UserStatus.OFFLINE }
  });

  // Create Relationships (Hierarchy)
  const relationships = [
    { managerUserId: admin.id, subordinateUserId: supervisor.id, relationshipType: 'DIRECT_REPORT' },
    { managerUserId: supervisor.id, subordinateUserId: staff.id, relationshipType: 'DIRECT_REPORT' }
  ];

  for (const rel of relationships) {
    await prisma.userRelationship.create({ data: rel });
  }

  console.log('Seeding complete! Development accounts created.');
  console.log('Use password: password123');
  console.log('Accounts: admin@example.com, supervisor@example.com, staff@example.com, citizen@example.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Clean up existing data to prevent unique constraint errors during re-seeding
  await prisma.userRelationship.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  
  const org = await prisma.organization.create({
    data: { name: 'Main Campus', code: 'MAIN' }
  });

  const hashPassword = await bcrypt.hash('password123', 10);

  // Create Users
  const manager = await prisma.user.create({
    data: { name: 'Admin Manager', email: 'manager@example.com', passwordHash: hashPassword, role: Role.MANAGER, status: UserStatus.ONLINE }
  });

  const faculty = await prisma.user.create({
    data: { name: 'Dr. Faculty', email: 'faculty@example.com', passwordHash: hashPassword, role: Role.FACULTY, status: UserStatus.OFFLINE }
  });

  const intern = await prisma.user.create({
    data: { name: 'Jane Intern', email: 'intern@example.com', passwordHash: hashPassword, role: Role.INTERN, status: UserStatus.OFFLINE }
  });

  const core = await prisma.user.create({
    data: { name: 'Mike Core', email: 'core@example.com', passwordHash: hashPassword, role: Role.CORE_MEMBER, status: UserStatus.OFFLINE }
  });

  const coordinator = await prisma.user.create({
    data: { name: 'Sarah Coordinator', email: 'coordinator@example.com', passwordHash: hashPassword, role: Role.COORDINATOR, status: UserStatus.OFFLINE }
  });

  const student = await prisma.user.create({
    data: { name: 'Alex Student', email: 'student@example.com', passwordHash: hashPassword, role: Role.STUDENT, status: UserStatus.OFFLINE }
  });

  // Create Relationships (Hierarchy)
  const relationships = [
    { managerUserId: manager.id, subordinateUserId: faculty.id, relationshipType: 'DIRECT_REPORT' },
    { managerUserId: manager.id, subordinateUserId: intern.id, relationshipType: 'DIRECT_REPORT' },
    { managerUserId: faculty.id, subordinateUserId: core.id, relationshipType: 'DIRECT_REPORT' },
    { managerUserId: intern.id, subordinateUserId: core.id, relationshipType: 'MATRIX_REPORT' },
    { managerUserId: core.id, subordinateUserId: coordinator.id, relationshipType: 'DIRECT_REPORT' }
  ];

  for (const rel of relationships) {
    await prisma.userRelationship.create({ data: rel });
  }

  console.log('Seeding complete! Development accounts created.');
  console.log('Use password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

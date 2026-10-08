const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  console.log('Cleaning up database...');
  // Delete all dependencies first
  await prisma.auditLog.deleteMany();
  await prisma.call.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.locationHistory.deleteMany();
  await prisma.issueAttachment.deleteMany();
  await prisma.issueStatusHistory.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.userRelationship.deleteMany();
  await prisma.user.deleteMany();
  
  console.log('Fetching Supabase users...');
  let { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  
  console.log(`Deleting ${users.length} users from Supabase...`);
  for (const user of users) {
    await supabase.auth.admin.deleteUser(user.id);
  }

  const passwordHash = await bcrypt.hash('password123', 10);
  
  const userSpecs = [
    ...Array.from({length: 2}).map((_, i) => ({ email: `manager${i+1}@test.com`, name: `Manager ${i+1}`, roles: ['SUPERVISOR'], designations: ['MANAGER'] })),
    ...Array.from({length: 4}).map((_, i) => ({ email: `faculty${i+1}@test.com`, name: `Faculty ${i+1}`, roles: ['SUPERVISOR'], designations: ['FACULTY'] })),
    ...Array.from({length: 5}).map((_, i) => ({ email: `core${i+1}@test.com`, name: `Core ${i+1}`, roles: ['ADMIN'], designations: ['CORE'] })),
    ...Array.from({length: 6}).map((_, i) => ({ email: `coordinator${i+1}@test.com`, name: `Coordinator ${i+1}`, roles: ['STAFF'], designations: ['COORDINATOR'] }))
  ];

  console.log(`Creating ${userSpecs.length} users...`);
  for (const u of userSpecs) {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: 'password123',
      email_confirm: true,
    });

    if (authError) {
      console.error(`Failed to create ${u.email} in Supabase:`, authError.message);
      continue;
    }

    await prisma.user.create({
      data: {
        id: authData.user.id,
        email: u.email,
        name: u.name,
        passwordHash,
        roles: u.roles,
        designations: u.designations
      }
    });
    console.log(`Created ${u.email}`);
  }
  
  console.log('Done!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());

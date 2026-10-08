// removed dotenv
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const prisma = new PrismaClient();
const supabase = createClient(
  "https://skbmgcddlwzlvidvvsij.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrYm1nY2RkbHd6bHZpZHZ2c2lqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTAzMzg5NywiZXhwIjoyMTA2NjA5ODk3fQ.k37ykUCYfZ9o7hrkGmh3et7oSGlgNc7csmeOTPto2LQ"
);

async function run() {
  const users = await prisma.user.findMany();
  
  for (const user of users) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'password123',
        email_confirm: true
      });
      
      if (error) {
        if (error.message.includes('already registered')) {
            console.log(`${user.email} already registered in Supabase.`);
        } else {
            console.log(`Failed to create ${user.email} in Supabase: ${error.message}`);
        }
        continue;
      }
      
      const newId = data.user.id;
      
      await prisma.$executeRawUnsafe(`UPDATE "User" SET id = $1 WHERE email = $2`, newId, user.email);
      console.log(`Migrated ${user.email} to Supabase Auth -> New ID: ${newId}`);
      
    } catch (e) {
      console.error(e);
    }
  }
}

run().then(() => prisma.$disconnect());

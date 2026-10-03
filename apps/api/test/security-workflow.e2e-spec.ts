import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { Role } from '@prisma/client';

describe('Security & Workflow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    prisma = app.get(PrismaService);
    
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('Phase 0 Bug: Role Injection', () => {
    it('should NOT allow a user to register as MANAGER (fails currently)', async () => {
      const email = `hacker_${Date.now()}@test.com`;
      
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password: 'password123',
          name: 'Hacker',
          role: 'MANAGER' // Attempt to inject role
        })
        .expect(201); // The request succeeds

      // This test is written to EXPECT correct security behavior.
      // Currently, it will fail because the role IS injected.
      expect(res.body.user.role).not.toBe('MANAGER');
    });
  });

  describe('Phase 0 Bug: IDOR in Issues', () => {
    it('should NOT allow a user to update an issue they do not own (fails currently)', async () => {
      // 1. Create two regular students
      const user1Email = `student1_${Date.now()}@test.com`;
      const user2Email = `student2_${Date.now()}@test.com`;

      const res1 = await request(app.getHttpServer()).post('/auth/register').send({
        email: user1Email, password: 'password', name: 'Student 1'
      });
      const token1 = res1.body.access_token;
      
      const res2 = await request(app.getHttpServer()).post('/auth/register').send({
        email: user2Email, password: 'password', name: 'Student 2'
      });
      const token2 = res2.body.access_token;

      // 2. User 1 creates an issue
      const createRes = await request(app.getHttpServer())
        .post('/issues')
        .set('Authorization', `Bearer ${token1}`)
        .send({ title: 'My Issue', description: 'Test', locationLat: 0, locationLng: 0 });
      
      const issueId = createRes.body.id;

      // 3. User 2 tries to update User 1's issue
      // We expect a 403 Forbidden, but currently it returns 200.
      await request(app.getHttpServer())
        .patch(`/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ status: 'RESOLVED' })
        .expect(403); 
    });
  });

  describe('Phase 0 Bug: 403 on Task Verification', () => {
    it('should allow a manager to verify a task they created (fails currently)', async () => {
      // 1. Create manager (using the role injection bug to our advantage for this test setup!)
      const managerEmail = `manager_${Date.now()}@test.com`;
      const managerRes = await request(app.getHttpServer()).post('/auth/register').send({
        email: managerEmail, password: 'password', name: 'Manager', role: 'MANAGER'
      });
      const managerToken = managerRes.body.access_token;

      // 2. Create assignee (coordinator)
      const coordEmail = `coord_${Date.now()}@test.com`;
      const coordRes = await request(app.getHttpServer()).post('/auth/register').send({
        email: coordEmail, password: 'password', name: 'Coordinator', role: 'COORDINATOR'
      });
      const coordId = coordRes.body.user.id;
      const coordToken = coordRes.body.access_token;

      // 3. Manager creates task for coordinator
      const taskRes = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ title: 'Test Task', description: 'Test', assignedToId: coordId });
      
      const taskId = taskRes.body.id;

      // 4. Coordinator completes task
      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      // 5. Manager tries to VERIFY task
      // We expect 200 OK, but currently it returns 403 Forbidden.
      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'VERIFIED' })
        .expect(200);
    });
  });
});

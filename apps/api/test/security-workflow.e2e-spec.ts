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
        role: 'ADMIN' // Attempt to inject role
      })
      .expect(201);

    expect(res.body.user.role).not.toBe('ADMIN');
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

  describe('Phase 0 Bug: 403 on Issue Verification', () => {
    it('should allow a supervisor to verify an issue they created (fails currently)', async () => {
      const managerEmail = `supervisor_${Date.now()}@test.com`;
      const managerRes = await request(app.getHttpServer()).post('/auth/register').send({
        email: managerEmail, password: 'password', name: 'Manager', role: 'SUPERVISOR'
      });
      const managerToken = managerRes.body.access_token;

      const coordEmail = `staff_${Date.now()}@test.com`;
      const coordRes = await request(app.getHttpServer()).post('/auth/register').send({
        email: coordEmail, password: 'password', name: 'Coordinator', role: 'STAFF'
      });
      const coordId = coordRes.body.user.id;
      const coordToken = coordRes.body.access_token;

      const issueRes = await request(app.getHttpServer())
        .post('/issues')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ title: 'Test Issue', description: 'Test', assignedToId: coordId });
      
      const issueId = issueRes.body.id;

      await request(app.getHttpServer())
        .patch(`/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ status: 'RESOLVED' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'VERIFIED' })
        .expect(200);
    });
  });
});

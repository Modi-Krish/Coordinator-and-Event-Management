import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthorizationService } from './authorization.service.js';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      userRelationship: {
        findFirst: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    };
    service = new AuthorizationService(mockPrisma);
  });

  describe('canAssignTask', () => {
    it('should reject task assignment from Coordinators', async () => {
      const coordinator = {
        userId: 'coord-1',
        roles: [Role.STAFF],
        designations: ['COORDINATOR'],
      };

      await expect(
        service.canAssignTask(coordinator, 'target-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject task assignment from Students', async () => {
      const student = {
        userId: 'student-1',
        roles: [Role.CITIZEN],
        designations: ['STUDENT'],
      };

      await expect(
        service.canAssignTask(student, 'target-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow Intern to assign tasks to Coordinators within their scope', async () => {
      const intern = {
        userId: 'intern-1',
        roles: [Role.STAFF],
        designations: ['INTERN'],
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'coord-1',
        designations: ['COORDINATOR'],
        roles: [Role.STAFF],
      });

      mockPrisma.userRelationship.findFirst.mockResolvedValue({
        id: 'rel-1',
        managerUserId: 'intern-1',
        subordinateUserId: 'coord-1',
      });

      await expect(
        service.canAssignTask(intern, 'coord-1'),
      ).resolves.toBeUndefined();
    });

    it('should reject Intern assigning tasks to Coordinators OUTSIDE their scope', async () => {
      const intern = {
        userId: 'intern-1',
        roles: [Role.STAFF],
        designations: ['INTERN'],
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'coord-2',
        designations: ['COORDINATOR'],
        roles: [Role.STAFF],
      });

      // Not in scope
      mockPrisma.userRelationship.findFirst.mockResolvedValue(null);

      await expect(
        service.canAssignTask(intern, 'coord-2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject Intern assigning tasks to other non-Coordinators (e.g. Faculty)', async () => {
      const intern = {
        userId: 'intern-1',
        roles: [Role.STAFF],
        designations: ['INTERN'],
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'faculty-1',
        designations: ['FACULTY'],
        roles: [Role.STAFF],
      });

      await expect(
        service.canAssignTask(intern, 'faculty-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow Faculty to assign tasks to Interns, Core Members, and Coordinators within scope', async () => {
      const faculty = {
        userId: 'faculty-1',
        roles: [Role.STAFF],
        designations: ['FACULTY'],
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'intern-1',
        designations: ['INTERN'],
        roles: [Role.STAFF],
      });

      mockPrisma.userRelationship.findFirst.mockResolvedValue({
        id: 'rel-2',
        managerUserId: 'faculty-1',
        subordinateUserId: 'intern-1',
      });

      await expect(
        service.canAssignTask(faculty, 'intern-1'),
      ).resolves.toBeUndefined();
    });

    it('should allow Manager to assign tasks to subordinates within their scope', async () => {
      const manager = {
        userId: 'mgr-1',
        roles: [Role.STAFF],
        designations: ['MANAGER'],
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'faculty-1',
        designations: ['FACULTY'],
        roles: [Role.STAFF],
      });

      mockPrisma.userRelationship.findFirst.mockResolvedValue({
        id: 'rel-3',
        managerUserId: 'mgr-1',
        subordinateUserId: 'faculty-1',
      });

      await expect(
        service.canAssignTask(manager, 'faculty-1'),
      ).resolves.toBeUndefined();
    });

    it('should allow Admin to bypass scope checks', async () => {
      const admin = {
        userId: 'admin-1',
        roles: [Role.ADMIN],
        designations: [],
      };

      await expect(
        service.canAssignTask(admin, 'any-user'),
      ).resolves.toBeUndefined();
    });
  });

  describe('canViewUserLocation', () => {
    it('should allow Supervisors and Admins to view any user location', async () => {
      const supervisor = {
        userId: 'sup-1',
        roles: [Role.SUPERVISOR],
        designations: [],
      };

      expect(await service.canViewUserLocation(supervisor, 'coord-1')).toBe(true);
    });

    it('should allow Manager to view any user location', async () => {
      const manager = {
        userId: 'mgr-1',
        roles: [Role.STAFF],
        designations: ['MANAGER'],
      };

      expect(await service.canViewUserLocation(manager, 'coord-1')).toBe(true);
    });

    it('should allow Faculty to view location of subordinates only', async () => {
      const faculty = {
        userId: 'faculty-1',
        roles: [Role.STAFF],
        designations: ['FACULTY'],
      };

      mockPrisma.userRelationship.findFirst.mockImplementation(({ where }: any) => {
        if (where.managerUserId === 'faculty-1' && where.subordinateUserId === 'coord-1') {
          return Promise.resolve({ id: 'rel-1' });
        }
        return Promise.resolve(null);
      });

      expect(await service.canViewUserLocation(faculty, 'coord-1')).toBe(true);
      expect(await service.canViewUserLocation(faculty, 'unrelated-coord')).toBe(false);
    });

    it('should not allow Coordinators to view other coordinators location', async () => {
      const coordinator = {
        userId: 'coord-1',
        roles: [Role.STAFF],
        designations: ['COORDINATOR'],
      };

      expect(await service.canViewUserLocation(coordinator, 'coord-2')).toBe(false);
    });
  });

  describe('canVerifyIssue', () => {
    it('should return true only for SUPERVISOR or ADMIN', () => {
      expect(service.canVerifyIssue({ roles: [Role.SUPERVISOR] })).toBe(true);
      expect(service.canVerifyIssue({ roles: [Role.ADMIN] })).toBe(true);
      expect(service.canVerifyIssue({ roles: [Role.STAFF], designations: ['COORDINATOR'] })).toBe(false);
      expect(service.canVerifyIssue({ roles: [Role.STAFF], designations: ['FACULTY'] })).toBe(false);
      expect(service.canVerifyIssue({ roles: [Role.CITIZEN] })).toBe(false);
    });
  });
});

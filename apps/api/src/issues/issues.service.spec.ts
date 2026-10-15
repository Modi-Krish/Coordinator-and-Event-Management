import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IssuesService } from './issues.service.js';
import { Role, IssueType, IssueStatus, Priority } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

describe('IssuesService - Round Robin & Assignment Logic', () => {
  let service: IssuesService;
  let mockPrisma: any;
  let mockNotificationsService: any;
  let mockRealtimeGateway: any;
  let mockAuthService: any;
  let mockStorageService: any;
  let cursorState: string | null = null;

  const coordinators = [
    { id: 'coord-1', name: 'Alice Coordinator', designations: ['COORDINATOR'], isActive: true },
    { id: 'coord-2', name: 'Bob Coordinator', designations: ['COORDINATOR'], isActive: true },
    { id: 'coord-3', name: 'Charlie Coordinator', designations: ['COORDINATOR'], isActive: true },
  ];

  beforeEach(() => {
    cursorState = null;

    mockPrisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn(async (callback) => {
        const tx = {
          user: {
            findMany: vi.fn().mockResolvedValue(coordinators),
          },
          roundRobinCursor: {
            upsert: vi.fn().mockImplementation(async () => {
              return { poolKey: 'global', lastAssigneeId: cursorState };
            }),
            findUnique: vi.fn().mockImplementation(async () => {
              return cursorState ? { poolKey: 'global', lastAssigneeId: cursorState } : null;
            }),
            create: vi.fn().mockImplementation(async ({ data }: any) => {
              cursorState = data.lastAssigneeId;
              return { poolKey: data.poolKey, lastAssigneeId: cursorState };
            }),
            update: vi.fn().mockImplementation(async ({ data }: any) => {
              cursorState = data.lastAssigneeId;
              return { poolKey: 'global', lastAssigneeId: cursorState };
            }),
          },
        };
        return callback(tx);
      }),
      issue: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          return {
            id: 'issue-' + Math.random().toString(36).substring(7),
            ...data,
            reportedBy: { id: data.reportedById, name: 'Student' },
            assignedTo: data.assignedToId ? { id: data.assignedToId, name: 'Assigned User' } : null,
          };
        }),
      },
      issueStatusHistory: {
        create: vi.fn().mockResolvedValue({ id: 'hist-1' }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      notification: {
        create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
      },
    };

    mockNotificationsService = {
      createNotification: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    mockRealtimeGateway = {
      server: {
        emit: vi.fn(),
        to: vi.fn().mockReturnValue({ emit: vi.fn() }),
      },
    };

    mockAuthService = {
      canAssignTask: vi.fn(),
      canAssignIssue: vi.fn(),
      canViewIssue: vi.fn().mockResolvedValue(true),
      canUpdateIssue: vi.fn(),
      canVerifyIssue: vi.fn().mockReturnValue(true),
    };

    mockStorageService = {
      uploadFile: vi.fn().mockResolvedValue('http://mock/file.png'),
    };

    service = new IssuesService(
      mockPrisma,
      mockNotificationsService,
      mockRealtimeGateway,
      mockAuthService,
      mockStorageService,
    );
  });

  describe('6-Issue Round-Robin Cycle', () => {
    it('should cycle through 3 coordinators: 1 -> 2 -> 3 -> 1 -> 2 -> 3', async () => {
      const studentUser = {
        userId: 'student-1',
        roles: [Role.CITIZEN],
        designations: ['STUDENT'],
      };

      const assignedCoordinators: (string | null)[] = [];

      for (let i = 1; i <= 6; i++) {
        const issue = await service.reportIssue(studentUser, {
          title: `Student Issue #${i}`,
          description: `Description ${i}`,
          category: 'Sanitation',
          priority: Priority.MEDIUM,
          type: IssueType.ISSUE,
        });

        expect(issue.status).toBe(IssueStatus.ASSIGNED);
        assignedCoordinators.push(issue.assignedToId);
      }

      // Verify strict 1 -> 2 -> 3 -> 1 -> 2 -> 3 round-robin sequence
      expect(assignedCoordinators).toEqual([
        'coord-1',
        'coord-2',
        'coord-3',
        'coord-1',
        'coord-2',
        'coord-3',
      ]);
    });
  });

  describe('Direct Assignment Precedence', () => {
    it('should assign directly when assignedToId is provided by authorized authority and not trigger round-robin', async () => {
      const facultyUser = {
        userId: 'faculty-1',
        roles: [Role.STAFF],
        designations: ['FACULTY'],
      };

      const issue = await service.reportIssue(facultyUser, {
        title: 'Direct Issue to Core Member',
        description: 'Direct assignment by faculty',
        category: 'Urgent',
        assignedToId: 'core-member-1',
        type: IssueType.ISSUE,
      });

      expect(mockAuthService.canAssignIssue).toHaveBeenCalledWith(facultyUser, 'core-member-1');
      expect(issue.assignedToId).toBe('core-member-1');
      expect(issue.status).toBe(IssueStatus.ASSIGNED);
      // Cursor should remain untouched
      expect(cursorState).toBeNull();
    });

    it('should reject task creation if canAssignTask throws ForbiddenException', async () => {
      const coordinatorUser = {
        userId: 'coord-1',
        roles: [Role.STAFF],
        designations: ['COORDINATOR'],
      };

      mockAuthService.canAssignTask.mockRejectedValue(
        new ForbiddenException('Coordinators and Students cannot assign tasks to others.'),
      );

      await expect(
        service.reportIssue(coordinatorUser, {
          title: 'Unauthorized Task',
          description: 'Coord trying to assign',
          assignedToId: 'coord-2',
          type: IssueType.TASK,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Eligibility handling', () => {
    it('should leave issue in REPORTED state if no coordinators are available', async () => {
      // Mock empty coordinator list
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          user: { findMany: vi.fn().mockResolvedValue([]) },
          roundRobinCursor: {
            upsert: vi.fn().mockResolvedValue({ poolKey: 'global', lastAssigneeId: null }),
            findUnique: vi.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      const studentUser = {
        userId: 'student-1',
        roles: [Role.CITIZEN],
        designations: ['STUDENT'],
      };

      const issue = await service.reportIssue(studentUser, {
        title: 'No Coordinators Available',
        description: 'Should remain unassigned',
        type: IssueType.ISSUE,
      });

      expect(issue.assignedToId).toBeNull();
      expect(issue.status).toBe(IssueStatus.REPORTED);
    });
  });
});

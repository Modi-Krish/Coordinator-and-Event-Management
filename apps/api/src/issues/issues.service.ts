import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IssueStatus, Role, IssueType, Priority } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { Inject } from '@nestjs/common';
import { STORAGE_SERVICE } from '../storage/storage.interface';
import type { IStorageService } from '../storage/storage.interface';
import { AuthorizationService } from '../auth/authorization.service';

// ─── Constants ───────────────────────────────────────────────────────────────
const COORDINATOR_POOL_KEY = 'global';

@Injectable()
export class IssuesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private realtimeGateway: RealtimeGateway,
    private authorizationService: AuthorizationService,
    @Inject(STORAGE_SERVICE) private storageService: IStorageService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Round-Robin: Atomic, persistent, concurrency-safe coordinator assignment
  //
  // Uses a DB transaction with upsert on RoundRobinCursor to ensure only one
  // coordinator is selected even under concurrent requests.
  // ─────────────────────────────────────────────────────────────────────────
  private async getNextCoordinatorRoundRobin(): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock the cursor row (upsert creates it if missing)
      const cursor = await tx.roundRobinCursor.upsert({
        where: { poolKey: COORDINATOR_POOL_KEY },
        update: {},
        create: { poolKey: COORDINATOR_POOL_KEY, lastAssigneeId: null },
      });

      // 2. Fetch all eligible (active) coordinators, stable order
      const coordinators = await tx.user.findMany({
        where: {
          roles: { has: Role.STAFF },
          designations: { has: 'COORDINATOR' },
          isActive: true,
        },
        orderBy: { id: 'asc' },
        select: { id: true },
      });

      if (coordinators.length === 0) return null;

      // 3. Determine next index
      const lastId = cursor.lastAssigneeId;
      const lastIdx = lastId
        ? coordinators.findIndex((c) => c.id === lastId)
        : -1;
      const nextIdx = (lastIdx + 1) % coordinators.length;
      const nextCoordinatorId = coordinators[nextIdx].id;

      // 4. Update cursor atomically
      await tx.roundRobinCursor.update({
        where: { poolKey: COORDINATOR_POOL_KEY },
        data: { lastAssigneeId: nextCoordinatorId },
      });

      return nextCoordinatorId;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // reportIssue
  //
  // Mechanism A: Student/Citizen reports → auto round-robin to coordinator.
  // Mechanism B: Authorized user reports with explicit assignedToId → direct assign.
  // ─────────────────────────────────────────────────────────────────────────
  async reportIssue(user: any, data: any) {
    let assigneeId: string | null = data.assignedToId ?? null;
    const type = data.type || IssueType.ISSUE;
    let assignmentMethod: string | null = null;

    // ── Mechanism B: Direct assignment (by authorized role) ──────────────
    if (assigneeId) {
      // TASK type: enforce task assignment authorization
      if (type === IssueType.TASK) {
        await this.authorizationService.canAssignTask(user, assigneeId);
      } else {
        // ISSUE type direct assignment
        await this.authorizationService.canAssignIssue(user, assigneeId);
      }
      assignmentMethod = 'DIRECT';
    }

    // ── Mechanism A: Auto round-robin for citizen/student ISSUE reports ──
    if (!assigneeId && type === IssueType.ISSUE) {
      const isCitizenOrStudent =
        user.roles?.includes(Role.CITIZEN) ||
        user.designations?.includes('STUDENT');

      if (isCitizenOrStudent) {
        assigneeId = await this.getNextCoordinatorRoundRobin();
        if (assigneeId) {
          assignmentMethod = 'ROUND_ROBIN';
        }
      }
    }

    const status = assigneeId ? IssueStatus.ASSIGNED : IssueStatus.REPORTED;

    const issue = await this.prisma.issue.create({
      data: {
        title: data.title,
        description: data.description,
        locationLat: data.locationLat,
        locationLng: data.locationLng,
        address: data.address,
        cityId: data.cityId,
        wardId: data.wardId,
        category: data.category,
        priority: data.priority || Priority.MEDIUM,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        reportedById: user.userId,
        assignedToId: assigneeId,
        status,
        type,
        restrictToRole: data.restrictToRole || null,
      },
      include: {
        reportedBy: { select: { id: true, name: true, designations: true } },
        assignedTo: { select: { id: true, name: true, designations: true } },
      },
    });

    // ── Write initial status history ──────────────────────────────────────
    await this.prisma.issueStatusHistory.create({
      data: {
        issueId: issue.id,
        changedById: user.userId,
        oldStatus: null,
        newStatus: status,
        remarks: assigneeId
          ? `Issue created and ${assignmentMethod === 'ROUND_ROBIN' ? 'auto-' : ''}assigned.`
          : 'Issue reported, awaiting assignment.',
        newAssigneeId: assigneeId,
        assignmentMethod,
      },
    });

    // ── Notify assigned coordinator ───────────────────────────────────────
    if (assigneeId) {
      await this.notificationsService.createNotification({
        recipientId: assigneeId,
        type: 'ISSUE_ASSIGNED',
        title: 'New Issue Assigned',
        message: `A new issue "${issue.title}" has been assigned to you.`,
        referenceType: 'ISSUE',
        referenceId: issue.id,
      });
    } else {
      // No coordinator available — notify supervisors
      await this.notifySupervisorsOfUnassignedIssue(issue, user.userId);
    }

    // ── Broadcast real-time ───────────────────────────────────────────────
    this.realtimeGateway.server.emit('issue:new', issue);

    // ── Audit log ─────────────────────────────────────────────────────────
    await this.prisma.auditLog.create({
      data: {
        action: 'ISSUE_CREATED',
        entityType: 'ISSUE',
        entityId: issue.id,
        actorId: user.userId,
        newValues: { assigneeId, assignmentMethod, status },
      },
    });

    return issue;
  }

  private async notifySupervisorsOfUnassignedIssue(issue: any, _reportedById: string) {
    // Find all SUPERVISOR/ADMIN users to notify
    const supervisors = await this.prisma.user.findMany({
      where: {
        OR: [
          { roles: { has: Role.SUPERVISOR } },
          { roles: { has: Role.ADMIN } },
        ],
        isActive: true,
      },
      select: { id: true },
    });

    for (const supervisor of supervisors) {
      await this.notificationsService.createNotification({
        recipientId: supervisor.id,
        type: 'ISSUE_UNASSIGNED',
        title: 'Issue Needs Assignment',
        message: `Issue "${issue.title}" has no eligible coordinator. Manual assignment required.`,
        referenceType: 'ISSUE',
        referenceId: issue.id,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Direct / Manual Issue Assignment (PATCH /issues/:id/assign)
  // ─────────────────────────────────────────────────────────────────────────
  async assignIssue(user: any, issueId: string, assigneeId: string, remarks?: string) {
    const issue = await this.getIssueById(issueId);

    await this.authorizationService.canAssignIssue(user, assigneeId);

    const previousAssigneeId = issue.assignedToId;

    const updated = await this.prisma.issue.update({
      where: { id: issueId },
      data: {
        assignedToId: assigneeId,
        status: IssueStatus.ASSIGNED,
      },
      include: {
        reportedBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    // Record in history with assignment tracking
    await this.prisma.issueStatusHistory.create({
      data: {
        issueId,
        changedById: user.userId,
        oldStatus: issue.status as IssueStatus,
        newStatus: IssueStatus.ASSIGNED,
        remarks: remarks ?? 'Manually assigned by authorized supervisor.',
        previousAssigneeId,
        newAssigneeId: assigneeId,
        assignmentMethod: 'MANUAL_REASSIGN',
      },
    });

    // Notify new assignee
    await this.notificationsService.createNotification({
      recipientId: assigneeId,
      type: 'ISSUE_ASSIGNED',
      title: 'Issue Directly Assigned to You',
      message: `Issue "${updated.title}" has been directly assigned to you by a supervisor.`,
      referenceType: 'ISSUE',
      referenceId: issueId,
    });

    // Notify previous assignee if there was one
    if (previousAssigneeId && previousAssigneeId !== assigneeId) {
      await this.notificationsService.createNotification({
        recipientId: previousAssigneeId,
        type: 'ISSUE_REASSIGNED',
        title: 'Issue Reassigned',
        message: `Issue "${updated.title}" has been reassigned away from you.`,
        referenceType: 'ISSUE',
        referenceId: issueId,
      });
    }

    await this.prisma.auditLog.create({
      data: {
        action: 'ISSUE_ASSIGNED',
        entityType: 'ISSUE',
        entityId: issueId,
        actorId: user.userId,
        oldValues: { assigneeId: previousAssigneeId },
        newValues: { assigneeId, assignmentMethod: 'MANUAL_REASSIGN' },
      },
    });

    this.realtimeGateway.server.emit('issue:updated', updated);
    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // getIssues — role-aware visibility
  // ─────────────────────────────────────────────────────────────────────────
  async getIssues(user: any, type?: IssueType) {
    let where: any = {};
    if (type) where.type = type;

    const isSupervisorOrAdmin =
      user.roles?.includes(Role.SUPERVISOR) || user.roles?.includes(Role.ADMIN);
    const designations: string[] = (user.designations ?? []).map((d: string) =>
      d.toUpperCase(),
    );

    if (isSupervisorOrAdmin || designations.includes('MANAGER')) {
      // Full visibility
    } else if (designations.some((d) => ['FACULTY', 'INTERN', 'CORE'].includes(d))) {
      // See issues assigned to self OR to subordinates
      const subordinateIds = await this.prisma.userRelationship
        .findMany({
          where: { managerUserId: user.userId },
          select: { subordinateUserId: true },
        })
        .then((rels) => rels.map((r) => r.subordinateUserId));

      where.OR = [
        { assignedToId: user.userId },
        { reportedById: user.userId },
        ...(subordinateIds.length > 0
          ? [{ assignedToId: { in: subordinateIds } }]
          : []),
      ];
    } else if (user.roles?.includes(Role.STAFF)) {
      // STAFF (Coordinator): only see own assigned issues + reported
      where.OR = [
        { assignedToId: user.userId },
        { reportedById: user.userId },
      ];
    } else {
      // CITIZEN / STUDENT: only own reported issues
      where.reportedById = user.userId;
    }

    return this.prisma.issue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        reportedBy: { select: { id: true, name: true, designations: true } },
        assignedTo: { select: { id: true, name: true, designations: true } },
        attachments: true,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // getIssueById
  // ─────────────────────────────────────────────────────────────────────────
  async getIssueById(issueId: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        attachments: true,
        history: {
          orderBy: { createdAt: 'asc' },
          include: { changedBy: { select: { id: true, name: true } } },
        },
        reportedBy: { select: { id: true, name: true, designations: true } },
        assignedTo: { select: { id: true, name: true, designations: true } },
      },
    });
    if (!issue) throw new NotFoundException('Issue not found');
    return issue;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // updateIssueStatus
  // ─────────────────────────────────────────────────────────────────────────
  async updateIssueStatus(user: any, issueId: string, status: IssueStatus, remarks?: string) {
    const issue = await this.getIssueById(issueId);

    // Authorization check
    await this.authorizationService.canUpdateIssue(user, issue);

    // Role restriction on issue
    if (
      issue.restrictToRole &&
      !user.roles?.includes(issue.restrictToRole) &&
      !user.roles?.includes(Role.ADMIN)
    ) {
      throw new ForbiddenException(
        `This task is restricted to ${issue.restrictToRole} level`,
      );
    }

    // Verification gate: SUPERVISOR or ADMIN only
    if (
      status === IssueStatus.VERIFIED &&
      !this.authorizationService.canVerifyIssue(user)
    ) {
      throw new ForbiddenException('Only supervisors or admins can verify issues');
    }

    const oldStatus = issue.status;

    const updatedIssue = await this.prisma.issue.update({
      where: { id: issueId },
      data: {
        status,
        ...(status === IssueStatus.ACCEPTED && { acceptedAt: new Date() }),
        ...(status === IssueStatus.IN_PROGRESS && { startedAt: new Date() }),
        ...(status === IssueStatus.RESOLVED && { resolvedAt: new Date() }),
        ...(status === IssueStatus.VERIFIED && { verifiedAt: new Date() }),
        ...(status === IssueStatus.CLOSED && { closedAt: new Date() }),
      },
      include: {
        reportedBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    // Record history
    await this.prisma.issueStatusHistory.create({
      data: {
        issueId,
        changedById: user.userId,
        oldStatus,
        newStatus: status,
        remarks,
      },
    });

    // Notify relevant parties
    await this.sendStatusChangeNotifications(updatedIssue, user, status);

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'STATUS_CHANGED',
        entityType: 'ISSUE',
        entityId: issueId,
        actorId: user.userId,
        oldValues: { status: oldStatus },
        newValues: { status },
      },
    });

    this.realtimeGateway.server.emit('issue:updated', updatedIssue);
    return updatedIssue;
  }

  private async sendStatusChangeNotifications(issue: any, actor: any, newStatus: IssueStatus) {
    const recipientIds = new Set<string>();

    // Always notify reporter and assignee (unless they're the actor)
    if (issue.reportedById && issue.reportedById !== actor.userId) {
      recipientIds.add(issue.reportedById);
    }
    if (issue.assignedToId && issue.assignedToId !== actor.userId) {
      recipientIds.add(issue.assignedToId);
    }

    const notifTypes: Partial<Record<IssueStatus, string>> = {
      [IssueStatus.ACCEPTED]: 'ISSUE_ACCEPTED',
      [IssueStatus.RESOLVED]: 'ISSUE_RESOLVED',
      [IssueStatus.ESCALATED]: 'ISSUE_ESCALATED',
      [IssueStatus.VERIFIED]: 'ISSUE_VERIFIED',
    };

    const notifType = notifTypes[newStatus] ?? 'ISSUE_UPDATED';
    const titleMap: Partial<Record<IssueStatus, string>> = {
      [IssueStatus.ACCEPTED]: 'Issue Accepted',
      [IssueStatus.RESOLVED]: 'Issue Resolved',
      [IssueStatus.ESCALATED]: 'Issue Escalated',
      [IssueStatus.VERIFIED]: 'Issue Verified',
    };
    const title = titleMap[newStatus] ?? 'Issue Status Updated';

    for (const recipientId of recipientIds) {
      await this.notificationsService.createNotification({
        recipientId,
        type: notifType,
        title,
        message: `Issue "${issue.title}" status changed to ${newStatus}.`,
        referenceType: 'ISSUE',
        referenceId: issue.id,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // updateIssuePriority
  // ─────────────────────────────────────────────────────────────────────────
  async updateIssuePriority(user: any, issueId: string, priority: Priority) {
    await this.getIssueById(issueId);

    const isSupervisorOrAdmin =
      user.roles?.includes(Role.SUPERVISOR) || user.roles?.includes(Role.ADMIN);
    const isStaff = user.roles?.includes(Role.STAFF);

    if (!isSupervisorOrAdmin && !isStaff) {
      throw new ForbiddenException('Not authorized to update issue priority');
    }

    const updatedIssue = await this.prisma.issue.update({
      where: { id: issueId },
      data: { priority },
    });

    this.realtimeGateway.server.emit('issue:updated', updatedIssue);
    return updatedIssue;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // uploadAttachment
  // ─────────────────────────────────────────────────────────────────────────
  async uploadAttachment(user: any, issueId: string, file: Express.Multer.File) {
    const issue = await this.getIssueById(issueId);

    const isOwner = issue.reportedById === user.userId;
    const isAssignee = issue.assignedToId === user.userId;
    const isSupervisorOrAdmin =
      user.roles?.includes(Role.SUPERVISOR) || user.roles?.includes(Role.ADMIN);

    if (!isOwner && !isAssignee && !isSupervisorOrAdmin) {
      throw new ForbiddenException(
        'Not authorized to upload attachments for this issue',
      );
    }

    const fileUrl = await this.storageService.uploadFile(file, `issues/${issueId}`);

    const attachment = await this.prisma.issueAttachment.create({
      data: {
        issueId,
        uploadedById: user.userId,
        fileUrl,
        fileType: file.originalname.split('.').pop(),
        mimeType: file.mimetype,
        fileSize: file.size,
      },
    });

    return attachment;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // deleteIssue
  // ─────────────────────────────────────────────────────────────────────────
  async deleteIssue(user: any, issueId: string) {
    const issue = await this.getIssueById(issueId);

    const isOwner = issue.reportedById === user.userId;
    const isAdminOrSupervisor =
      user.roles?.includes(Role.ADMIN) || user.roles?.includes(Role.SUPERVISOR);

    if (!isOwner && !isAdminOrSupervisor) {
      throw new ForbiddenException('Not authorized to delete this issue');
    }

    await this.prisma.issueAttachment.deleteMany({ where: { issueId } });
    await this.prisma.notification.deleteMany({
      where: { referenceId: issueId, referenceType: 'ISSUE' },
    });
    await this.prisma.issueStatusHistory.deleteMany({ where: { issueId } });
    await this.prisma.issue.delete({ where: { id: issueId } });

    await this.prisma.auditLog.create({
      data: {
        action: 'ISSUE_DELETED',
        entityType: 'ISSUE',
        entityId: issueId,
        actorId: user.userId,
      },
    });

    this.realtimeGateway.server.emit('issue:deleted', issueId);
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // getIssueHistory
  // ─────────────────────────────────────────────────────────────────────────
  async getIssueHistory(issueId: string) {
    return this.prisma.issueStatusHistory.findMany({
      where: { issueId },
      orderBy: { createdAt: 'asc' },
      include: { changedBy: { select: { id: true, name: true } } },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // createTask — for authorized users creating tasks (type=TASK)
  // Alias to reportIssue with type forced to TASK
  // ─────────────────────────────────────────────────────────────────────────
  async createTask(user: any, data: any) {
    // Coordinators and students cannot create tasks (for assignment to others)
    const designations: string[] = (user.designations ?? []).map((d: string) =>
      d.toUpperCase(),
    );

    if (
      designations.includes('COORDINATOR') ||
      designations.includes('STUDENT') ||
      user.roles?.includes(Role.CITIZEN)
    ) {
      if (data.assignedToId) {
        throw new ForbiddenException('Coordinators cannot assign tasks to others.');
      }
    }

    return this.reportIssue(user, { ...data, type: IssueType.TASK });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // getDashboardStats — manager-level overview stats
  // ─────────────────────────────────────────────────────────────────────────
  async getDashboardStats(user: any) {
    const isSupervisorOrAdmin =
      user.roles?.includes(Role.SUPERVISOR) || user.roles?.includes(Role.ADMIN);
    const designations: string[] = (user.designations ?? []).map((d: string) =>
      d.toUpperCase(),
    );

    let issueWhere: any = {};
    let taskWhere: any = { type: IssueType.TASK };

    if (!isSupervisorOrAdmin && !designations.includes('MANAGER')) {
      // Scope to own team
      const subordinateIds = await this.prisma.userRelationship
        .findMany({ where: { managerUserId: user.userId }, select: { subordinateUserId: true } })
        .then((r) => r.map((x) => x.subordinateUserId));

      const scopeFilter = {
        OR: [
          { assignedToId: user.userId },
          { reportedById: user.userId },
          ...(subordinateIds.length > 0 ? [{ assignedToId: { in: subordinateIds } }] : []),
        ],
      };
      issueWhere = { ...scopeFilter, type: IssueType.ISSUE };
      taskWhere = { ...scopeFilter, type: IssueType.TASK };
    } else {
      issueWhere = { type: IssueType.ISSUE };
    }

    const [
      totalIssues,
      openIssues,
      inProgressIssues,
      resolvedIssues,
      escalatedIssues,
      unassignedIssues,
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
    ] = await Promise.all([
      this.prisma.issue.count({ where: issueWhere }),
      this.prisma.issue.count({ where: { ...issueWhere, status: IssueStatus.REPORTED } }),
      this.prisma.issue.count({ where: { ...issueWhere, status: IssueStatus.IN_PROGRESS } }),
      this.prisma.issue.count({ where: { ...issueWhere, status: IssueStatus.RESOLVED } }),
      this.prisma.issue.count({ where: { ...issueWhere, status: IssueStatus.ESCALATED } }),
      this.prisma.issue.count({ where: { ...issueWhere, assignedToId: null } }),
      this.prisma.issue.count({ where: taskWhere }),
      this.prisma.issue.count({ where: { ...taskWhere, status: IssueStatus.ASSIGNED } }),
      this.prisma.issue.count({ where: { ...taskWhere, status: IssueStatus.IN_PROGRESS } }),
      this.prisma.issue.count({ where: { ...taskWhere, status: IssueStatus.RESOLVED } }),
      this.prisma.issue.count({
        where: {
          ...taskWhere,
          deadline: { lt: new Date() },
          status: { notIn: [IssueStatus.RESOLVED, IssueStatus.CLOSED, IssueStatus.VERIFIED] },
        },
      }),
    ]);

    return {
      issues: { total: totalIssues, open: openIssues, inProgress: inProgressIssues, resolved: resolvedIssues, escalated: escalatedIssues, unassigned: unassignedIssues },
      tasks: { total: totalTasks, pending: pendingTasks, inProgress: inProgressTasks, completed: completedTasks, overdue: overdueTasks },
    };
  }
}

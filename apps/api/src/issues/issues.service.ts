import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IssueStatus, Role, IssueType, Priority } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { Inject } from '@nestjs/common';
import { STORAGE_SERVICE } from '../storage/storage.interface';
import type { IStorageService } from '../storage/storage.interface';

@Injectable()
export class IssuesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private realtimeGateway: RealtimeGateway,
    @Inject(STORAGE_SERVICE) private storageService: IStorageService
  ) {}

  async reportIssue(userId: string, data: any) {
    let assigneeId = data.assignedToId;

    let type = data.type || IssueType.ISSUE;
    
    // Auto-assign Student (CITIZEN) issues to Coordinators via Round-Robin
    if (!assigneeId && type === IssueType.ISSUE) {
      // Find all coordinators in the ward/city
      const coordinators = await this.prisma.user.findMany({
        where: { 
          roles: { has: Role.STAFF },
          designations: { has: 'COORDINATOR' }
        },
        orderBy: { id: 'asc' }
      });

      if (coordinators.length > 0) {
        // Find the last assigned issue to any coordinator
        const lastIssue = await this.prisma.issue.findFirst({
          where: { type: IssueType.ISSUE, assignedToId: { in: coordinators.map((c: any) => c.id) } },
          orderBy: { createdAt: 'desc' },
          select: { assignedToId: true }
        });

        if (!lastIssue || !lastIssue.assignedToId) {
          assigneeId = coordinators[0].id;
        } else {
          const lastIdx = coordinators.findIndex((c: any) => c.id === lastIssue.assignedToId);
          const nextIdx = (lastIdx + 1) % coordinators.length;
          assigneeId = coordinators[nextIdx].id;
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
        cityId: data.cityId,
        wardId: data.wardId,
        reportedById: userId,
        assignedToId: assigneeId,
        status,
        type,
        restrictToRole: data.restrictToRole || null,
      },
    });

    if (assigneeId) {
      await this.notificationsService.createNotification({
        recipientId: assigneeId,
        type: 'ISSUE_ASSIGNED',
        title: 'New Issue Assigned',
        message: `A new issue "${issue.title}" has been assigned to you.`,
        referenceType: 'ISSUE',
        referenceId: issue.id,
      });
    }

    this.realtimeGateway.server.emit('issue:new', issue);

    return issue;
  }

  async getIssues(user: any, type?: any) {
    // Basic RBAC for issue visibility
    let query: any = { where: {} };
    if (type) query.where.type = type;

    if (user.roles.includes(Role.SUPERVISOR) || user.roles.includes(Role.ADMIN)) {
      // see all
    } else if (user.roles.includes(Role.STAFF)) {
      query.where.OR = [
        { assignedToId: user.userId },
      ];
    } else if (user.roles.includes(Role.CITIZEN)) {
      query.where.reportedById = user.userId;
    }
    
    return this.prisma.issue.findMany(query);
  }

  async getIssueById(issueId: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
      include: { attachments: true },
    });
    if (!issue) throw new NotFoundException('Issue not found');
    return issue;
  }

  async updateIssueStatus(user: any, issueId: string, status: IssueStatus) {
    const issue = await this.getIssueById(issueId);
    
    const isOwner = issue.reportedById === user.userId;
    const isAssignee = issue.assignedToId === user.userId;
    const isSupervisorOrAdmin = user.roles.includes(Role.SUPERVISOR) || user.roles.includes(Role.ADMIN);
    
    if (!isOwner && !isAssignee && !isSupervisorOrAdmin) {
      throw new ForbiddenException('Not authorized to update this issue');
    }
    
    if (issue.restrictToRole && !user.roles.includes(issue.restrictToRole) && !user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException(`This task is restricted to ${issue.restrictToRole} level`);
    }
    
    if (status === IssueStatus.VERIFIED && !isSupervisorOrAdmin) {
      throw new ForbiddenException('Only supervisors or admins can verify issues');
    }
    
    const updatedIssue = await this.prisma.issue.update({
      where: { id: issueId },
      data: {
        status,
        ...(status === IssueStatus.ACCEPTED && { acceptedAt: new Date() }),
        ...(status === IssueStatus.RESOLVED && { resolvedAt: new Date() }),
        ...(status === IssueStatus.CLOSED && { closedAt: new Date() }),
      },
    });

    this.realtimeGateway.server.emit('issue:updated', updatedIssue);

    return updatedIssue;
  }

  async updateIssuePriority(user: any, issueId: string, priority: Priority) {
    const _issue = await this.getIssueById(issueId);

    const isSupervisorOrAdmin = user.roles.includes(Role.SUPERVISOR) || user.roles.includes(Role.ADMIN);
    const isStaff = user.roles.includes(Role.STAFF);

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

  async uploadAttachment(user: any, issueId: string, file: Express.Multer.File) {
    const issue = await this.getIssueById(issueId);
    
    // Only related users can upload attachments
    const isOwner = issue.reportedById === user.userId;
    const isAssignee = issue.assignedToId === user.userId;
    const isSupervisorOrAdmin = user.roles.includes(Role.SUPERVISOR) || user.roles.includes(Role.ADMIN);
    
    if (!isOwner && !isAssignee && !isSupervisorOrAdmin) {
      throw new ForbiddenException('Not authorized to upload attachments for this issue');
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
      }
    });

    return attachment;
  }

  async deleteIssue(user: any, issueId: string) {
    const issue = await this.getIssueById(issueId);
    
    const isOwner = issue.reportedById === user.userId;
    const isAdminOrSupervisor = user.roles.includes(Role.ADMIN) || user.roles.includes(Role.SUPERVISOR);
    
    if (!isOwner && !isAdminOrSupervisor) {
      throw new ForbiddenException('Not authorized to delete this issue');
    }

    // Delete related attachments and notifications first due to FK constraints
    await this.prisma.issueAttachment.deleteMany({ where: { issueId } });
    await this.prisma.notification.deleteMany({ where: { referenceId: issueId, referenceType: 'ISSUE' } });
    
    await this.prisma.issue.delete({ where: { id: issueId } });
    
    // Broadcast deletion
    this.realtimeGateway.server.emit('issue:deleted', issueId);
    
    return { success: true };
  }
}

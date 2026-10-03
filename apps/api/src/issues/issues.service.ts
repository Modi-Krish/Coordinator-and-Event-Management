import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IssueStatus, Role } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class IssuesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService
  ) {}

  async reportIssue(userId: string, data: any) {
    let assigneeId = data.assignedToId;

    if (!assigneeId) {
      // Basic assignment logic: Find a coordinator to assign this to
      const availableCoordinator = await this.prisma.user.findFirst({
        where: { role: Role.STAFF },
        orderBy: { assignedIssues: { _count: 'asc' } } // Load balancing based on active issues
      });
      assigneeId = availableCoordinator?.id || null;
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

    return issue;
  }

  async getIssues(user: any) {
    // Basic RBAC for issue visibility
    if (user.role === Role.SUPERVISOR || user.role === Role.ADMIN) {
      return this.prisma.issue.findMany();
    } else if (user.role === Role.STAFF) {
      return this.prisma.issue.findMany({
        where: { assignedToId: user.userId },
      });
    } else if (user.role === Role.CITIZEN) {
      return this.prisma.issue.findMany({
        where: { reportedById: user.userId },
      });
    }
    // Other roles would need hierarchy resolution
    return this.prisma.issue.findMany();
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
    const isSupervisorOrAdmin = user.role === Role.SUPERVISOR || user.role === Role.ADMIN;
    
    if (!isOwner && !isAssignee && !isSupervisorOrAdmin) {
      throw new ForbiddenException('Not authorized to update this issue');
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

    return updatedIssue;
  }
}

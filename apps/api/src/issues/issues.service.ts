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
    // Basic assignment logic: Find a coordinator to assign this to
    const availableCoordinator = await this.prisma.user.findFirst({
      where: { role: Role.COORDINATOR },
      orderBy: { assignedIssues: { _count: 'asc' } } // Load balancing based on active issues
    });

    const status = availableCoordinator ? IssueStatus.ASSIGNED : IssueStatus.REPORTED;

    const issue = await this.prisma.issue.create({
      data: {
        ...data,
        reportedById: userId,
        assignedToId: availableCoordinator?.id || null,
        status,
      },
    });

    if (availableCoordinator) {
      await this.notificationsService.createNotification({
        recipientId: availableCoordinator.id,
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
    if (user.role === Role.MANAGER) {
      return this.prisma.issue.findMany();
    } else if (user.role === Role.COORDINATOR) {
      return this.prisma.issue.findMany({
        where: { assignedToId: user.userId },
      });
    } else if (user.role === Role.STUDENT) {
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

  async updateIssueStatus(userId: string, issueId: string, status: IssueStatus) {
    const issue = await this.getIssueById(issueId);
    
    // Additional auth checks should be implemented based on hierarchy
    
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

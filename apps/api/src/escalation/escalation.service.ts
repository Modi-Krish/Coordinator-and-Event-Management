import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { IssueStatus } from '@prisma/client';

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // Run every 30 minutes to check for unresolved issues
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleIssueEscalations() {
    this.logger.debug('Running issue escalation check...');

    // Find unresolved issues older than 2 hours that haven't been escalated
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const overdueIssues = await this.prisma.issue.findMany({
      where: {
        status: { notIn: [IssueStatus.RESOLVED, IssueStatus.CLOSED, IssueStatus.ESCALATED, IssueStatus.REJECTED] },
        createdAt: { lt: twoHoursAgo },
      },
      include: {
        assignedTo: {
          include: {
            managerRelations: {
              include: { manager: true }
            }
          }
        }
      }
    });

    for (const issue of overdueIssues) {
      if (issue.assignedTo && issue.assignedTo.managerRelations.length > 0) {
        // Escalate to manager
        const managerId = issue.assignedTo.managerRelations[0].managerUserId;
        
        // Update issue status
        await this.prisma.issue.update({
          where: { id: issue.id },
          data: { status: IssueStatus.ESCALATED }
        });

        // Notify manager
        await this.notificationsService.createNotification({
          recipientId: managerId,
          type: 'ESCALATION',
          title: `Issue Escalated: ${issue.title}`,
          message: `An issue assigned to ${issue.assignedTo.name} has been unresolved for over 2 hours.`,
          referenceType: 'ISSUE',
          referenceId: issue.id,
        });

        this.logger.debug(`Escalated issue ${issue.id} to manager ${managerId}`);
      }
    }
  }
}

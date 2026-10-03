import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  async createNotification(data: {
    recipientId: string;
    type: string;
    title: string;
    message: string;
    referenceType?: string;
    referenceId?: string;
  }) {
    const notification = await this.prisma.notification.create({ data });

    // Broadcast via WebSockets
    this.realtimeGateway.server
      .to(`user:${data.recipientId}`)
      .emit('notification:new', notification);

    return notification;
  }

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }
}

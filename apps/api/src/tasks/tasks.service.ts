import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus, Role } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService
  ) {}

  async createTask(userId: string, data: any) {
    const task = await this.prisma.task.create({
      data: {
        ...data,
        createdById: userId,
      },
    });

    if (data.assignedToId) {
      await this.notificationsService.createNotification({
        recipientId: data.assignedToId,
        type: 'TASK_ASSIGNED',
        title: 'New Task Assigned',
        message: `You have been assigned a new task: ${task.title}`,
        referenceType: 'TASK',
        referenceId: task.id,
      });
    }

    return task;
  }

  async getTasks(user: any) {
    // Basic RBAC for task visibility
    if (user.role === Role.MANAGER) {
      return this.prisma.task.findMany();
    } else if (user.role === Role.COORDINATOR) {
      return this.prisma.task.findMany({
        where: { assignedToId: user.userId },
      });
    }
    // Other roles would need hierarchy resolution to get their team's tasks
    return this.prisma.task.findMany({
      where: { createdById: user.userId },
    });
  }

  async getTaskById(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { history: true, attachments: true },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async updateTaskStatus(userId: string, taskId: string, status: TaskStatus, locationLat?: number, locationLng?: number) {
    const task = await this.getTaskById(taskId);
    
    // Check if the user is authorized to update this task
    if (task.assignedToId !== userId) {
      // In a real app, supervisors could also update status
      throw new ForbiddenException('Not authorized to update this task');
    }

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        ...(status === TaskStatus.IN_PROGRESS && { startedAt: new Date() }),
        ...(status === TaskStatus.COMPLETED && { completedAt: new Date() }),
        ...(status === TaskStatus.VERIFIED && { verifiedAt: new Date() }),
      },
      include: {
        createdBy: true
      }
    });

    // Record the status change history
    await this.prisma.taskStatusHistory.create({
      data: {
        taskId,
        changedById: userId,
        oldStatus: task.status,
        newStatus: status,
        locationLat,
        locationLng,
      },
    });

    // Notify Supervisor when Task is Completed
    if (status === TaskStatus.COMPLETED) {
      await this.notificationsService.createNotification({
        recipientId: updatedTask.createdById,
        type: 'TASK_COMPLETED',
        title: 'Task Completed',
        message: `Task ${updatedTask.title} has been completed and is pending verification.`,
        referenceType: 'TASK',
        referenceId: updatedTask.id,
      });
    }

    // Notify Assignee when Task is Verified/Rejected
    if (status === TaskStatus.VERIFIED || status === TaskStatus.REJECTED) {
      if (updatedTask.assignedToId) {
        await this.notificationsService.createNotification({
          recipientId: updatedTask.assignedToId,
          type: `TASK_${status}`,
          title: `Task ${status === TaskStatus.VERIFIED ? 'Verified' : 'Rejected'}`,
          message: `Your task ${updatedTask.title} has been ${status.toLowerCase()}.`,
          referenceType: 'TASK',
          referenceId: updatedTask.id,
        });
      }
    }

    return updatedTask;
  }
}

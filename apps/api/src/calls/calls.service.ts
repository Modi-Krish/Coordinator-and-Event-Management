import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CallStatus } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class CallsService {
  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  async initiateCall(initiatedById: string, recipientId: string, callType: string) {
    const call = await this.prisma.call.create({
      data: {
        initiatedById,
        recipientId,
        callType,
      },
      include: {
        initiatedBy: true,
      }
    });

    // Ring the recipient via WebSockets
    this.realtimeGateway.server
      .to(`user:${recipientId}`)
      .emit('call:incoming', {
        callId: call.id,
        callType: call.callType,
        caller: {
          id: call.initiatedBy.id,
          name: call.initiatedBy.name,
        }
      });

    return call;
  }

  async updateCallStatus(callId: string, status: CallStatus) {
    const data: any = { status };
    if (status === CallStatus.ACCEPTED) data.startedAt = new Date();
    if (status === CallStatus.ENDED || status === CallStatus.REJECTED || status === CallStatus.MISSED) {
      data.endedAt = new Date();
    }

    return this.prisma.call.update({
      where: { id: callId },
      data,
    });
  }

  async getCallHistory(userId: string) {
    return this.prisma.call.findMany({
      where: {
        OR: [
          { initiatedById: userId },
          { recipientId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        initiatedBy: { select: { name: true } },
        recipient: { select: { name: true } }
      }
    });
  }
}

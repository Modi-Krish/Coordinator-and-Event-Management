import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsAuthGuard } from './ws-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.headers.authorization?.split(' ')[1];
      if (!token) return client.disconnect();
      
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'super-secret',
      });
      client.data.user = payload;

      // Join rooms based on userId and role
      client.join(`user:${payload.sub}`);
      client.join(`role:${payload.role}`);

      if (payload.role === 'MANAGER') {
        client.join('all_locations');
      }

      // Join hierarchy rooms to track subordinates
      const subordinates = await this.prisma.userRelationship.findMany({
        where: { managerUserId: payload.sub }
      });
      for (const rel of subordinates) {
        client.join(`managers_of:${rel.subordinateUserId}`);
      }

      console.log(`Client connected: ${payload.sub} (Role: ${payload.role})`);
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.data?.user?.sub}`);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lat: number; lng: number; accuracy?: number }
  ) {
    const user = client.data.user;
    
    // 1. Broadcast the new location to supervisors/hierarchy
    const locationData = {
      userId: user.sub,
      ...data,
      timestamp: new Date().toISOString()
    };
    
    this.server.to(`managers_of:${user.sub}`).emit('location:update', locationData);
    this.server.to('all_locations').emit('location:update', locationData);

    // 2. Persist to History (rate limit this in production, e.g., once per min)
    await this.prisma.locationHistory.create({
      data: {
        userId: user.sub,
        latitude: data.lat,
        longitude: data.lng,
        accuracy: data.accuracy,
      }
    });

    return { status: 'ok' };
  }

  // WebRTC Signaling
  
  @UseGuards(WsAuthGuard)
  @SubscribeMessage('call:signal')
  async handleCallSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; signal: any }
  ) {
    const user = client.data.user;
    // Relay signaling data (ICE candidates, SDP offers/answers) to the target user
    this.server.to(`user:${data.targetUserId}`).emit('call:signal', {
      fromUserId: user.sub,
      signal: data.signal,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('call:accept')
  async handleCallAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callerId: string }
  ) {
    const user = client.data.user;
    this.server.to(`user:${data.callerId}`).emit('call:accepted', {
      responderId: user.sub,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('call:reject')
  async handleCallReject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callerId: string }
  ) {
    const user = client.data.user;
    this.server.to(`user:${data.callerId}`).emit('call:rejected', {
      responderId: user.sub,
    });
  }
}

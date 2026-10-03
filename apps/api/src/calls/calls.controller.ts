import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CallsService } from './calls.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CallStatus } from '@prisma/client';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post('initiate')
  async initiateCall(@Request() req: any, @Body() data: { recipientId: string, callType: string }) {
    return this.callsService.initiateCall(req.user.userId, data.recipientId, data.callType);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: CallStatus) {
    return this.callsService.updateCallStatus(id, status);
  }

  @Get()
  async getCallHistory(@Request() req: any) {
    return this.callsService.getCallHistory(req.user.userId);
  }
}

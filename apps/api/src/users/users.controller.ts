import { Controller, Get, Post, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.SUPERVISOR, Role.ADMIN, Role.STAFF)
  async createUser(@Request() req: any, @Body() data: any) {
    // Determine the reporting manager. Usually the user creating, unless specified and allowed
    let managerId = req.user.userId;
    if (data.reportingManagerId && req.user.role === Role.ADMIN) {
      managerId = data.reportingManagerId; // Manager can assign to someone else (e.g. Faculty)
    }
    
    return this.usersService.createUser(managerId, data);
  }

  @Get('team')
  async getMyTeam(@Request() req: any) {
    return this.usersService.getMyTeam(req.user.userId, req.user.role);
  }

  @Get('hierarchy')
  async getHierarchy(@Request() req: any) {
    return this.usersService.getHierarchy(req.user.userId);
  }
}

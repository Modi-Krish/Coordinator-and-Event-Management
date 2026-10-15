import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Create new user ────────────────────────────────────────────────────
  @Post()
  @Roles(Role.SUPERVISOR, Role.ADMIN, Role.STAFF)
  async createUser(@Request() req: any, @Body() data: any) {
    let managerId = req.user.userId;
    if (data.reportingManagerId && req.user.roles?.includes(Role.ADMIN)) {
      managerId = data.reportingManagerId;
    }
    return this.usersService.createUser(managerId, data);
  }

  // ── Team members (role-scoped) ──────────────────────────────────────────
  @Get('team')
  async getMyTeam(@Request() req: any) {
    return this.usersService.getMyTeam(
      req.user.userId,
      req.user.roles,
      req.user.designations,
    );
  }

  // ── Hierarchy tree ─────────────────────────────────────────────────────
  @Get('hierarchy')
  async getHierarchy(@Request() req: any) {
    return this.usersService.getHierarchy(req.user.userId);
  }

  // ── Team location overview ─────────────────────────────────────────────
  @Get('locations')
  async getTeamLocations(@Request() req: any) {
    return this.usersService.getTeamLocations(req.user);
  }

  // ── Single user location ───────────────────────────────────────────────
  @Get(':id/location')
  async getUserLastLocation(@Request() req: any, @Param('id') id: string) {
    return this.usersService.getUserLastLocation(req.user, id);
  }

  // ── Location sharing toggle ─────────────────────────────────────────────
  @Patch('me/location-sharing')
  async setLocationSharing(
    @Request() req: any,
    @Body('enabled') enabled: boolean,
  ) {
    return this.usersService.setLocationSharing(req.user.userId, enabled);
  }

  // ── Update roles/designations (admin only) ─────────────────────────────
  @Patch(':id/roles')
  @Roles(Role.ADMIN)
  async updateRolesAndDesignations(
    @Param('id') id: string,
    @Body('roles') roles?: Role[],
    @Body('designations') designations?: string[],
  ) {
    return this.usersService.updateRolesAndDesignations(id, roles, designations);
  }
}

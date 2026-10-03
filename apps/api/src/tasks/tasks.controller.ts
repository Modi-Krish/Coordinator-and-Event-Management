import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, TaskStatus } from '@prisma/client';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles(Role.MANAGER, Role.FACULTY, Role.CORE_MEMBER) // Only certain roles can create tasks
  async createTask(@Request() req: any, @Body() data: any) {
    return this.tasksService.createTask(req.user.userId, data);
  }

  @Get()
  async getTasks(@Request() req: any) {
    return this.tasksService.getTasks(req.user);
  }

  @Get(':id')
  async getTaskById(@Param('id') id: string) {
    return this.tasksService.getTaskById(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: TaskStatus,
    @Body('lat') lat?: number,
    @Body('lng') lng?: number,
  ) {
    return this.tasksService.updateTaskStatus(req.user.userId, id, status, lat, lng);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IssuesService } from './issues.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, IssueStatus, Priority, IssueType } from '@prisma/client';

@Controller('issues')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  // ── Create issue/task ──────────────────────────────────────────────────
  @Post()
  @Roles(Role.CITIZEN, Role.STAFF, Role.SUPERVISOR, Role.ADMIN)
  async reportIssue(@Request() req: any, @Body() data: any) {
    return this.issuesService.reportIssue(req.user, data);
  }

  // ── Create task (type=TASK) — separate route with stricter checks ──────
  @Post('tasks')
  @Roles(Role.STAFF, Role.SUPERVISOR, Role.ADMIN)
  async createTask(@Request() req: any, @Body() data: any) {
    return this.issuesService.createTask(req.user, data);
  }

  // ── List issues (role-aware visibility) ─────────────────────────────────
  @Get()
  async getIssues(@Request() req: any, @Query('type') type?: IssueType) {
    return this.issuesService.getIssues(req.user, type);
  }

  // ── Dashboard stats ──────────────────────────────────────────────────────
  @Get('stats/dashboard')
  async getDashboardStats(@Request() req: any) {
    return this.issuesService.getDashboardStats(req.user);
  }

  // ── Get single issue ─────────────────────────────────────────────────────
  @Get(':id')
  async getIssueById(@Param('id') id: string) {
    return this.issuesService.getIssueById(id);
  }

  // ── Get issue history ─────────────────────────────────────────────────────
  @Get(':id/history')
  async getIssueHistory(@Param('id') id: string) {
    return this.issuesService.getIssueHistory(id);
  }

  // ── Update status ─────────────────────────────────────────────────────────
  @Patch(':id/status')
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: IssueStatus,
    @Body('remarks') remarks?: string,
  ) {
    return this.issuesService.updateIssueStatus(req.user, id, status, remarks);
  }

  // ── Direct assignment (supervisor / hierarchy) ────────────────────────────
  @Patch(':id/assign')
  @Roles(Role.STAFF, Role.SUPERVISOR, Role.ADMIN)
  async assignIssue(
    @Request() req: any,
    @Param('id') id: string,
    @Body('assigneeId') assigneeId: string,
    @Body('remarks') remarks?: string,
  ) {
    return this.issuesService.assignIssue(req.user, id, assigneeId, remarks);
  }

  // ── Update priority ───────────────────────────────────────────────────────
  @Patch(':id/priority')
  @Roles(Role.STAFF, Role.SUPERVISOR, Role.ADMIN)
  async updatePriority(
    @Request() req: any,
    @Param('id') id: string,
    @Body('priority') priority: Priority,
  ) {
    return this.issuesService.updateIssuePriority(req.user, id, priority);
  }

  // ── Upload attachment ─────────────────────────────────────────────────────
  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Request() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.issuesService.uploadAttachment(req.user, id, file);
  }

  // ── Delete issue ──────────────────────────────────────────────────────────
  @Delete(':id')
  async deleteIssue(@Request() req: any, @Param('id') id: string) {
    return this.issuesService.deleteIssue(req.user, id);
  }
}

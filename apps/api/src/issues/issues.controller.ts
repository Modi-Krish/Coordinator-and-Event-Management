import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, IssueStatus } from '@prisma/client';

@Controller('issues')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  @Roles(Role.STUDENT, Role.COORDINATOR, Role.CORE_MEMBER, Role.FACULTY, Role.INTERN, Role.MANAGER) 
  async reportIssue(@Request() req: any, @Body() data: any) {
    return this.issuesService.reportIssue(req.user.userId, data);
  }

  @Get()
  async getIssues(@Request() req: any) {
    return this.issuesService.getIssues(req.user);
  }

  @Get(':id')
  async getIssueById(@Param('id') id: string) {
    return this.issuesService.getIssueById(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: IssueStatus,
  ) {
    return this.issuesService.updateIssueStatus(req.user.userId, id, status);
  }
}

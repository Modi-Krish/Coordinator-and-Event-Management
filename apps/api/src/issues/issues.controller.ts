import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
  @Roles(Role.CITIZEN, Role.STAFF, Role.SUPERVISOR, Role.ADMIN) 
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
    return this.issuesService.updateIssueStatus(req.user, id, status);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Request() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.issuesService.uploadAttachment(req.user, id, file);
  }
}

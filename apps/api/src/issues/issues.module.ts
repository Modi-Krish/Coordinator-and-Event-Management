import { Module } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { IssuesController } from './issues.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [NotificationsModule, StorageModule, RealtimeModule, AuthModule],
  providers: [IssuesService],
  controllers: [IssuesController],
})
export class IssuesModule {}


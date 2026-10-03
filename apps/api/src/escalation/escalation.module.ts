import { Module } from '@nestjs/common';
import { EscalationService } from './escalation.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [EscalationService],
})
export class EscalationModule {}

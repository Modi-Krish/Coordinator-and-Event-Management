import { Module } from '@nestjs/common';
import { EscalationService } from './escalation.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [NotificationsModule, RealtimeModule],
  providers: [EscalationService],
})
export class EscalationModule {}

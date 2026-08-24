import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './api/notifications.controller.js';
import { NotificationsService } from './application/notifications.service.js';
import { NotificationsRepository } from './infra/notifications.repository.js';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository],
  exports: [NotificationsService],
})
export class NotificationsModule {}

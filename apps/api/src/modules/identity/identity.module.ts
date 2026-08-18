/* Identity module wiring. */
import { Global, Module } from '@nestjs/common';
import { IdentityController } from './api/identity.controller.js';
import { IdentityService } from './application/identity.service.js';
import { AdminSeeder } from './application/admin.seeder.js';
import { UsersRepository } from './infra/users.repository.js';
import { VerificationsRepository } from './infra/verifications.repository.js';
import { SessionsRepository } from './infra/sessions.repository.js';
import { Notifications } from './infra/notifications.js';

@Global()
@Module({
  controllers: [IdentityController],
  providers: [
    IdentityService,
    AdminSeeder,
    UsersRepository,
    VerificationsRepository,
    SessionsRepository,
    Notifications,
  ],
  exports: [IdentityService],
})
export class IdentityModule {}

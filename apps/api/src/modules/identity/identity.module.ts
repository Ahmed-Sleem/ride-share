/* Identity module wiring. */
import { Module } from '@nestjs/common';
import { IdentityController } from './api/identity.controller.js';
import { IdentityGuard } from './api/identity.guard.js';
import { IdentityService } from './application/identity.service.js';
import { AdminSeeder } from './application/admin.seeder.js';
import { UsersRepository } from './infra/users.repository.js';
import { OtpRepository } from './infra/otp.repository.js';
import { SessionsRepository } from './infra/sessions.repository.js';

@Module({
  controllers: [IdentityController],
  providers: [
    IdentityGuard,
    IdentityService,
    AdminSeeder,
    UsersRepository,
    OtpRepository,
    SessionsRepository,
  ],
  exports: [IdentityGuard, IdentityService],
})
export class IdentityModule {}

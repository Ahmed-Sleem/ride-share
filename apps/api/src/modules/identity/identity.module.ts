/* Identity module wiring. */
import { Global, Module } from '@nestjs/common';
import { IdentityController } from './api/identity.controller.js';
import { IdentityService } from './application/identity.service.js';
import { AdminSeeder } from './application/admin.seeder.js';
import { UsersRepository } from './infra/users.repository.js';
import { OtpRepository } from './infra/otp.repository.js';
import { SessionsRepository } from './infra/sessions.repository.js';

@Global()
@Module({
  controllers: [IdentityController],
  providers: [
    IdentityService,
    AdminSeeder,
    UsersRepository,
    OtpRepository,
    SessionsRepository,
  ],
  exports: [IdentityService],
})
export class IdentityModule {}

import { Global, Module } from '@nestjs/common';
import { AuditService } from './application/audit.service.js';
import { AuditRepository } from './infra/audit.repository.js';
import { AuditController } from './api/audit.controller.js';

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditRepository],
  exports: [AuditService],
})
export class AuditModule {}

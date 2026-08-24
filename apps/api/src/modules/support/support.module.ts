import { Module } from '@nestjs/common';
import { SupportController } from './api/support.controller.js';
import { SupportService } from './application/support.service.js';
import { SupportRepository } from './infra/support.repository.js';

@Module({
  controllers: [SupportController],
  providers: [SupportService, SupportRepository],
  exports: [SupportService],
})
export class SupportModule {}

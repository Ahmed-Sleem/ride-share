/* Payments module (P3.7, Path A). Global so any module may consume the
   payments contract (top-up info, cash-collected, issue-credit) through
   contracts/public.ts only — never internals (check-boundaries enforces). */
import { Global, Module } from '@nestjs/common';
import { PaymentsController } from './api/payments.controller.js';
import { PaymentsService } from './application/payments.service.js';
import { PaymentsRepository } from './infra/payments.repository.js';

@Global()
@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository],
  exports: [PaymentsService],
})
export class PaymentsModule {}

/* Journeys module. @Global like routes/drivers/geo/audit: the journeys service
   is a cross-module read that other modules (bookings) resolve through
   contracts/public.ts. Without @Global, BookingsModule cannot inject
   JourneysService and the whole app fails to boot — this module was the one
   that missed the decorator and silently crash-looped production. */
import { Global, Module } from '@nestjs/common';
import { JourneysController } from './api/journeys.controller.js';
import { JourneysService } from './application/journeys.service.js';
import { JourneysRepository } from './infra/journeys.repository.js';
import { IdempotencyRepository } from './infra/idempotency.repository.js';
import { IdempotencyService } from './application/idempotency.service.js';

@Global()
@Module({
  controllers: [JourneysController],
  providers: [JourneysService, JourneysRepository, IdempotencyRepository, IdempotencyService],
  exports: [JourneysService, IdempotencyService],
})
export class JourneysModule {}

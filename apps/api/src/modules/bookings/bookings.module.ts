import { Global, Module } from '@nestjs/common';
import { BookingsController } from './api/bookings.controller.js';
import { BookingsService } from './application/bookings.service.js';
import { BookingsRepository } from './infra/bookings.repository.js';

@Global()
@Module({
  controllers: [BookingsController],
  providers: [BookingsService, BookingsRepository],
  exports: [BookingsService],
})
export class BookingsModule {}

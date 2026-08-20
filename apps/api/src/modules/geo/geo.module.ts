import { Module } from '@nestjs/common';
import { StopsController } from './api/stops.controller.js';
import { StopsService } from './application/stops.service.js';
import { StopsRepository } from './infra/stops.repository.js';

@Module({
  controllers: [StopsController],
  providers: [StopsService, StopsRepository],
  exports: [StopsService],
})
export class GeoModule {}

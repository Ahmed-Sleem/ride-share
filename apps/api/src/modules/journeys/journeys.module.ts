import { Module } from '@nestjs/common';
import { JourneysController } from './api/journeys.controller.js';
import { JourneysService } from './application/journeys.service.js';
import { JourneysRepository } from './infra/journeys.repository.js';
@Module({
  controllers: [JourneysController],
  providers: [JourneysService, JourneysRepository],
  exports: [JourneysService],
})
export class JourneysModule {}

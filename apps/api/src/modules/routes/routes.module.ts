import { Module } from '@nestjs/common';
import { RoutesController } from './api/routes.controller.js';
import { RoutesService } from './application/routes.service.js';
import { RoutesRepository } from './infra/routes.repository.js';

@Module({
  controllers: [RoutesController],
  providers: [RoutesService, RoutesRepository],
  exports: [RoutesService],
})
export class RoutesModule {}

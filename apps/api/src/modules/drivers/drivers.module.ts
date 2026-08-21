import { Global, Module } from '@nestjs/common';
import { DriversController } from './api/drivers.controller.js';
import { DriversService } from './application/drivers.service.js';
import { DriversRepository } from './infra/drivers.repository.js';

@Global()
@Module({
  controllers: [DriversController],
  providers: [DriversService, DriversRepository],
  exports: [DriversService],
})
export class DriversModule {}

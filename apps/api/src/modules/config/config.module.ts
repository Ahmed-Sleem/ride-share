import { Module } from '@nestjs/common';
import { PlatformSettingsController } from './api/platform-settings.controller.js';
import { PlatformSettingsService } from './application/platform-settings.service.js';
import { PlatformSettingsRepository } from './infra/platform-settings.repository.js';

@Module({
  controllers: [PlatformSettingsController],
  providers: [PlatformSettingsService, PlatformSettingsRepository],
  exports: [PlatformSettingsService],
})
export class PlatformConfigModule {}

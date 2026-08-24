import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { IdentityGuard } from '../../../security/identity.guard.js';
import type { Actor } from '../../identity/contracts/types.js';
import { PlatformSettingsService } from '../application/platform-settings.service.js';

class OwnerSettingsDto {
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(0) @Max(90)
  commission_percent?: number | null;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(0) @Max(20)
  notify_behavioural_max_day?: number | null;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(0) @Max(24)
  notify_behavioural_gap_hours?: number | null;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(0) @Max(10)
  notify_promo_max_day?: number | null;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(0) @Max(20)
  notify_promo_max_week?: number | null;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(0) @Max(20)
  notify_non_tx_max_day?: number | null;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsBoolean()
  paymob_enabled?: boolean | null;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsBoolean()
  auth_otp_bypass?: boolean | null;
}

type ReqWithActor = FastifyRequest & { actor?: Actor };

@Controller()
export class PlatformSettingsController {
  constructor(private readonly settings: PlatformSettingsService) {}

  @Get('admin/settings')
  @UseGuards(IdentityGuard)
  get(@Req() req: ReqWithActor) {
    return this.settings.get(req.actor!);
  }

  @Patch('admin/settings')
  @UseGuards(IdentityGuard)
  patch(@Req() req: ReqWithActor, @Body() dto: OwnerSettingsDto) {
    return this.settings.update(req.actor!, dto);
  }
}

import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { NotificationsService } from '../application/notifications.service.js';
import { IdentityGuard } from '../../../security/identity.guard.js';
import type { Actor } from '../../identity/contracts/types.js';

class DeviceDto {
  @IsString() @MinLength(8) token!: string;
  @IsOptional() @IsString() platform?: string;
}

type ReqWithActor = FastifyRequest & { actor?: Actor };

@Controller()
export class NotificationsController {
  constructor(private readonly notes: NotificationsService) {}

  @Get('notifications/mine')
  @UseGuards(IdentityGuard)
  mine(@Req() req: ReqWithActor) {
    return this.notes.mine(req.actor!);
  }

  @Post('notifications/device')
  @UseGuards(IdentityGuard)
  device(@Req() req: ReqWithActor, @Body() dto: DeviceDto) {
    return this.notes.registerDevice(req.actor!, dto.token, dto.platform || 'web');
  }
}

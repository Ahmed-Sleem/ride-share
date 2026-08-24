import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { NotificationsService } from '../application/notifications.service.js';
import { IdentityGuard } from '../../../security/identity.guard.js';
import type { Actor } from '../../identity/contracts/types.js';

type ReqWithActor = FastifyRequest & { actor?: Actor };

@Controller()
export class NotificationsController {
  constructor(private readonly notes: NotificationsService) {}

  @Get('notifications/mine')
  @UseGuards(IdentityGuard)
  mine(@Req() req: ReqWithActor) {
    return this.notes.mine(req.actor!);
  }
}

/* Audit HTTP surface — Super Admin only (CH02 §2.4). */
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuditService } from '../application/audit.service.js';
import { IdentityGuard } from '../../../security/identity.guard.js';

type ReqWithActor = FastifyRequest & { actor?: { id: string; role: string } };

@Controller()
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('admin/audit')
  @UseGuards(IdentityGuard)
  list(@Req() req: ReqWithActor) {
    return this.audit.list(req.actor!);
  }
}

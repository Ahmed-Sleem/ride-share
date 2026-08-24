import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { SupportService } from '../application/support.service.js';
import { IdentityGuard } from '../../../security/identity.guard.js';
import type { Actor } from '../../identity/contracts/types.js';

class SosDto {
  @IsOptional() @IsBoolean() silent?: boolean;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsString() bookingId?: string;
}

class ReportDto {
  @IsString() @MinLength(1) category!: string;
  @IsString() @MinLength(1) body!: string;
  @IsOptional() @IsString() bookingId?: string;
}

class ShareDto {
  @IsString() @MinLength(1) bookingId!: string;
}

class DecideDto {
  @IsString() @MinLength(1) decision!: string;
  @IsString() @MinLength(1) reason!: string;
}

type ReqWithActor = FastifyRequest & { actor?: Actor };

@Controller()
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post('support/sos')
  @UseGuards(IdentityGuard)
  sos(@Req() req: ReqWithActor, @Body() dto: SosDto) {
    return this.support.raiseSos(req.actor!, dto);
  }

  @Post('support/reports')
  @UseGuards(IdentityGuard)
  report(@Req() req: ReqWithActor, @Body() dto: ReportDto) {
    return this.support.report(req.actor!, dto);
  }

  @Post('support/shares')
  @UseGuards(IdentityGuard)
  share(@Req() req: ReqWithActor, @Body() dto: ShareDto) {
    return this.support.createShare(req.actor!, dto.bookingId);
  }

  @Get('support/share/:token')
  publicShare(@Param('token') token: string) {
    return this.support.publicShare(token);
  }

  @Get('support/incidents')
  @UseGuards(IdentityGuard)
  queue(@Req() req: ReqWithActor) {
    return this.support.queue(req.actor!);
  }

  @Get('support/mine')
  @UseGuards(IdentityGuard)
  mine(@Req() req: ReqWithActor) {
    return this.support.myTickets(req.actor!);
  }

  @Post('support/incidents/:id/investigate')
  @UseGuards(IdentityGuard)
  investigate(@Req() req: ReqWithActor, @Param('id') id: string) {
    return this.support.startInvestigation(req.actor!, id);
  }

  @Post('support/incidents/:id/decide')
  @UseGuards(IdentityGuard)
  decide(@Req() req: ReqWithActor, @Param('id') id: string, @Body() dto: DecideDto) {
    return this.support.decide(req.actor!, id, dto.decision, dto.reason);
  }
}

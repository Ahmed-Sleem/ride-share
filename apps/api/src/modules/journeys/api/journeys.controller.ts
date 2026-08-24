/* Journeys HTTP surface — thin. All logic lives in the application layer. */
import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { JourneysService } from '../application/journeys.service.js';
import { IdentityGuard } from '../../../security/identity.guard.js';
import type { Actor } from '../../identity/contracts/types.js';

class ClaimDto {
  @IsString() @MinLength(1) slotId!: string;
  @IsString() @MinLength(1) vehicleId!: string;
  @IsOptional() @IsBoolean() committed?: boolean;
}
class PositionDto {
  @IsNumber() lat!: number;
  @IsNumber() lng!: number;
}

type ReqWithActor = FastifyRequest & { actor?: Actor };

@Controller()
export class JourneysController {
  constructor(private readonly journeys: JourneysService) {}

  @Post('journeys/claim')
  @UseGuards(IdentityGuard)
  claim(@Req() req: ReqWithActor, @Body() dto: ClaimDto) {
    return this.journeys.claimSlot(req.actor!, dto.slotId, dto.vehicleId, dto.committed ?? true);
  }

  @Post('journeys/:id/release')
  @UseGuards(IdentityGuard)
  release(@Req() req: ReqWithActor, @Param('id') id: string) {
    return this.journeys.releaseClaim(req.actor!, id);
  }

  @Post('journeys/:id/open')
  @UseGuards(IdentityGuard)
  open(@Req() req: ReqWithActor, @Param('id') id: string) {
    return this.journeys.openForBooking(req.actor!, id);
  }

  @Get('journeys/mine')
  @UseGuards(IdentityGuard)
  mine(@Req() req: ReqWithActor) {
    return this.journeys.myJourneys(req.actor!);
  }

  @Get('journeys/available')
  @UseGuards(IdentityGuard)
  available(@Req() req: ReqWithActor, @Query('from') from: string, @Query('to') to: string) {
    return this.journeys.availableWork(req.actor!, from, to);
  }

  /** Riders: upcoming bookable departures on a route (P3.6). */
  @Get('journeys/upcoming')
  @UseGuards(IdentityGuard)
  upcoming(@Req() _req: ReqWithActor, @Query('route') route: string, @Query('from') from: string, @Query('to') to: string) {
    return this.journeys.upcomingForRiders(route || null, from, to);
  }

  @Post('journeys/:id/start')
  @UseGuards(IdentityGuard)
  start(@Req() req: ReqWithActor, @Param('id') id: string) {
    return this.journeys.start(req.actor!, id);
  }

  @Post('journeys/:id/position')
  @UseGuards(IdentityGuard)
  position(@Req() req: ReqWithActor, @Param('id') id: string, @Body() dto: PositionDto) {
    return this.journeys.position(req.actor!, id, dto.lat, dto.lng);
  }

  @Post('journeys/:id/arrive')
  @UseGuards(IdentityGuard)
  arrive(@Req() req: ReqWithActor, @Param('id') id: string) {
    return this.journeys.arriveNext(req.actor!, id);
  }

  @Get('journeys/:id/progress')
  @UseGuards(IdentityGuard)
  progress(@Req() req: ReqWithActor, @Param('id') id: string) {
    return this.journeys.progress(req.actor!, id);
  }
}

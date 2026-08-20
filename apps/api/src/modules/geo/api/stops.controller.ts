/* Stops HTTP surface — thin. All logic lives in the application layer; unknown
   fields are rejected by the global validation pipe. */
import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsNumber, IsOptional, IsString, Min, Max, MinLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { StopsService } from '../application/stops.service.js';
import { IdentityGuard } from '../../../security/identity.guard.js';
import type { Actor } from '../../identity/contracts/types.js';

class CreateStopDto {
  @IsOptional() @IsString() @MinLength(1) nameEn?: string;
  @IsOptional() @IsString() @MinLength(1) nameAr?: string;
  @IsNumber() @Min(-90) @Max(90) lat!: number;
  @IsNumber() @Min(-180) @Max(180) lng!: number;
  @IsIn(['desk', 'field']) source!: 'desk' | 'field';
  @IsOptional() @IsString() overrideReason?: string;
}

class ReviewStopDto {
  @IsIn(['approved', 'rejected']) decision!: 'approved' | 'rejected';
  @IsOptional() @IsString() reason?: string;
}

type ReqWithActor = FastifyRequest & { actor?: Actor };

@Controller()
export class StopsController {
  constructor(private readonly stops: StopsService) {}

  /** Public: verified stops near a point — no auth, no pending leak. */
  @Get('stops/near')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  near(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius = '1000'
  ) {
    return this.stops.verifiedNear(Number(lat), Number(lng), Math.min(Number(radius), 5000));
  }

  @Post('stops')
  @UseGuards(IdentityGuard)
  create(@Req() req: ReqWithActor, @Body() dto: CreateStopDto) {
    return this.stops.createStop(req.actor!, {
      nameEn: dto.nameEn, nameAr: dto.nameAr, lat: dto.lat, lng: dto.lng,
      source: dto.source, overrideReason: dto.overrideReason ?? null,
    });
  }

  @Get('stops')
  @UseGuards(IdentityGuard)
  list(@Req() req: ReqWithActor) {
    return this.stops.list(req.actor!);
  }

  @Post('stops/:id/review')
  @UseGuards(IdentityGuard)
  review(@Req() req: ReqWithActor, @Param('id') id: string, @Body() dto: ReviewStopDto) {
    return this.stops.reviewStop(req.actor!, id, dto.decision, dto.reason ?? null);
  }
}

/* Stops HTTP surface — thin. All logic lives in the application layer; unknown
   fields are rejected by the global validation pipe. */
import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min, Max, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { StopsService } from '../application/stops.service.js';
import { IdentityGuard } from '../../../security/identity.guard.js';
import type { Actor } from '../../identity/contracts/types.js';
import { STOP_STATUSES } from '../domain/stop.js';

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

class ImportStopsDto {
  @IsString() @MinLength(1) csv!: string;
}

class FieldChecklistDto {
  @IsBoolean() stand!: boolean;
  @IsBoolean() lit!: boolean;
  @IsBoolean() legal!: boolean;
  @IsBoolean() reachable!: boolean;
}

class CaptureStopDto {
  @IsString() @MinLength(8) captureId!: string;
  @IsNumber() @Min(-90) @Max(90) lat!: number;
  @IsNumber() @Min(-180) @Max(180) lng!: number;
  @IsNumber() @Min(0) @Max(200) gpsAccuracyM!: number;
  @ValidateNested() @Type(() => FieldChecklistDto) checklist!: FieldChecklistDto;
  @IsOptional() @IsString() photoDataUrl?: string;
  @IsOptional() @IsString() device?: string;
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

  @Post('stops/import')
  @UseGuards(IdentityGuard)
  importStops(@Req() req: ReqWithActor, @Body() dto: ImportStopsDto) {
    return this.stops.importStops(req.actor!, dto.csv);
  }

  @Post('stops/capture')
  @UseGuards(IdentityGuard)
  capture(@Req() req: ReqWithActor, @Body() dto: CaptureStopDto) {
    return this.stops.captureStop(req.actor!, {
      captureId: dto.captureId, lat: dto.lat, lng: dto.lng,
      gpsAccuracyM: dto.gpsAccuracyM, checklist: dto.checklist,
      photoDataUrl: dto.photoDataUrl, device: dto.device,
    });
  }

  @Post('stops/:id/submit')
  @UseGuards(IdentityGuard)
  submit(@Req() req: ReqWithActor, @Param('id') id: string) {
    return this.stops.submitStop(req.actor!, id);
  }

  @Get('stops')
  @UseGuards(IdentityGuard)
  list(@Req() req: ReqWithActor, @Query('status') status?: string) {
    const statuses = status ? [status as (typeof STOP_STATUSES)[number]] : undefined;
    return this.stops.list(req.actor!, statuses as never);
  }

  @Post('stops/:id/review')
  @UseGuards(IdentityGuard)
  review(@Req() req: ReqWithActor, @Param('id') id: string, @Body() dto: ReviewStopDto) {
    return this.stops.reviewStop(req.actor!, id, dto.decision, dto.reason ?? null);
  }

  @Post('stops/:id/retire')
  @UseGuards(IdentityGuard)
  retire(@Req() req: ReqWithActor, @Param('id') id: string) {
    return this.stops.retireStop(req.actor!, id);
  }

  @Get('stops/:id/photo')
  @UseGuards(IdentityGuard)
  async photo(@Req() req: ReqWithActor, @Param('id') id: string, @Res() res: FastifyReply) {
    const photo = await this.stops.photoForStop(req.actor!, id);
    if (!photo) {
      void res.status(404).send({ code: 'NOT_FOUND', message_key: 'geo.photo_not_found' });
      return;
    }
    void res.header('content-type', photo.mimeType).send(photo.bytes);
  }
}

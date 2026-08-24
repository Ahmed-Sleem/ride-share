/* Bookings HTTP surface — thin. All logic lives in the application layer. */
import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { BookingsService } from '../application/bookings.service.js';
import { IdempotencyService, readIdempotencyKey } from '../../journeys/contracts/public.js';
import { IdentityGuard } from '../../../security/identity.guard.js';
import type { Actor } from '../../identity/contracts/types.js';

class BookDto {
  @IsString() @MinLength(1) journeyId!: string;
  @IsString() @MinLength(1) boardingStopId!: string;
  @IsInt() @Min(1) @Max(4) seats!: number;
}

class ScanDto {
  @IsString() @MinLength(1) journeyId!: string;
  @IsString() @MinLength(1) code!: string;
}

class AbortDto {
  @IsString() @MinLength(1) reason!: string;
}

type ReqWithActor = FastifyRequest & { actor?: Actor };

@Controller()
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly idem: IdempotencyService,
  ) {}

  @Post('bookings')
  @UseGuards(IdentityGuard)
  book(@Req() req: ReqWithActor, @Body() dto: BookDto) {
    return this.bookings.book(req.actor!, dto);
  }

  @Get('bookings/mine')
  @UseGuards(IdentityGuard)
  mine(@Req() req: ReqWithActor) {
    return this.bookings.myBookings(req.actor!);
  }

  @Post('bookings/:id/cancel')
  @UseGuards(IdentityGuard)
  cancel(@Req() req: ReqWithActor, @Param('id') id: string) {
    return this.bookings.cancel(req.actor!, id);
  }

  @Post('bookings/scan')
  @UseGuards(IdentityGuard)
  scan(@Req() req: ReqWithActor, @Body() dto: ScanDto) {
    return this.idem.run(req.actor!.id, readIdempotencyKey(req.headers), () => this.bookings.scan(req.actor!, dto));
  }

  @Get('journeys/:id/manifest')
  @UseGuards(IdentityGuard)
  manifest(@Req() req: ReqWithActor, @Param('id') id: string) {
    return this.bookings.manifest(req.actor!, id);
  }

  @Post('bookings/:id/alight')
  @UseGuards(IdentityGuard)
  alight(@Req() req: ReqWithActor, @Param('id') id: string) {
    return this.bookings.requestAlight(req.actor!, id);
  }

  @Get('bookings/:id/live')
  @UseGuards(IdentityGuard)
  live(@Req() req: ReqWithActor, @Param('id') id: string) {
    return this.bookings.liveForRider(req.actor!, id);
  }

  @Post('journeys/:id/complete')
  @UseGuards(IdentityGuard)
  finish(@Req() req: ReqWithActor, @Param('id') id: string) {
    return this.idem.run(req.actor!.id, readIdempotencyKey(req.headers), () => this.bookings.finishJourney(req.actor!, id));
  }

  @Post('journeys/:id/abort')
  @UseGuards(IdentityGuard)
  abort(@Req() req: ReqWithActor, @Param('id') id: string, @Body() dto: AbortDto) {
    return this.bookings.abortJourney(req.actor!, id, dto.reason);
  }
}

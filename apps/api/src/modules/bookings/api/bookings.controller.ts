/* Bookings HTTP surface — thin. All logic lives in the application layer. */
import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { BookingsService } from '../application/bookings.service.js';
import { IdentityGuard } from '../../../security/identity.guard.js';
import type { Actor } from '../../identity/contracts/types.js';

class BookDto {
  @IsString() @MinLength(1) journeyId!: string;
  @IsString() @MinLength(1) boardingStopId!: string;
  @IsInt() @Min(1) @Max(4) seats!: number;
}

type ReqWithActor = FastifyRequest & { actor?: Actor };

@Controller()
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

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
}

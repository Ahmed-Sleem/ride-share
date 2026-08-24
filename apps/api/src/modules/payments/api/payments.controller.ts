/* Payments HTTP surface — thin. All logic lives in the application layer.
   The webhook route is deliberately NOT behind the identity guard: its
   authentication IS the HMAC signature (verified in the service, before any
   state changes), and it is rate-limited to blunt hammering. Every other
   route requires a signed-in actor and its capability (§8.2, one resolver). */
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { PaymentsService, TOPUP_MIN_MINOR, TOPUP_MAX_MINOR } from '../application/payments.service.js';
import { IdentityGuard } from '../../../security/identity.guard.js';
import type { Actor } from '../../identity/contracts/types.js';

class TopupDto {
  // bounds come from the ONE definition in the application layer (§0.3)
  @IsInt() @Min(TOPUP_MIN_MINOR) @Max(TOPUP_MAX_MINOR) amountMinor!: number;
}

class CashCollectedDto {
  @IsUUID() bookingId!: string;
}

type ReqWithActor = FastifyRequest & { actor?: Actor };

@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('payments/config')
  @UseGuards(IdentityGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  config(@Req() req: ReqWithActor) {
    return this.payments.config(req.actor!);
  }

  @Get('payments/wallet')
  @UseGuards(IdentityGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  wallet(@Req() req: ReqWithActor) {
    return this.payments.wallet(req.actor!);
  }

  @Post('payments/topup')
  @UseGuards(IdentityGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  topup(@Req() req: ReqWithActor, @Body() dto: TopupDto) {
    return this.payments.topup(req.actor!, { amountMinor: dto.amountMinor });
  }

  /** Public entry — the HMAC signature is the authentication. */
  @Post('payments/webhook')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  webhook(@Body() payload: unknown) {
    return this.payments.webhook(payload);
  }

  @Post('payments/cash-collected')
  @UseGuards(IdentityGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  cashCollected(@Req() req: ReqWithActor, @Body() dto: CashCollectedDto) {
    return this.payments.cashCollected(req.actor!, dto.bookingId);
  }

  @Get('payments/driver/earnings')
  @UseGuards(IdentityGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  driverEarnings(@Req() req: ReqWithActor) {
    return this.payments.driverEarnings(req.actor!);
  }
}

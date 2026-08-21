/* Drivers HTTP surface — thin. Driver application + ops review (P1, DEC-035). */
import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { DriversService } from '../application/drivers.service.js';
import { IdentityGuard } from '../../../security/identity.guard.js';
import type { Actor } from '../../identity/contracts/types.js';

class AddVehicleDto {
  @IsString() @MinLength(2) plate!: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() colour?: string;
}

class ReviewDto {
  @IsIn(['approve', 'reject']) decision!: 'approve' | 'reject';
  @IsOptional() @IsString() reason?: string;
}

type ReqWithActor = FastifyRequest & { actor?: Actor };

@Controller()
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Post('driver/apply')
  @UseGuards(IdentityGuard)
  apply(@Req() req: ReqWithActor) {
    return this.drivers.apply(req.actor!);
  }

  @Get('driver/me')
  @UseGuards(IdentityGuard)
  me(@Req() req: ReqWithActor) {
    return this.drivers.myProfile(req.actor!);
  }

  @Post('driver/vehicles')
  @UseGuards(IdentityGuard)
  addVehicle(@Req() req: ReqWithActor, @Body() dto: AddVehicleDto) {
    return this.drivers.addVehicle(req.actor!, dto.plate, dto.model ?? '', dto.colour ?? '');
  }

  @Get('driver/vehicles')
  @UseGuards(IdentityGuard)
  myVehicles(@Req() req: ReqWithActor) {
    return this.drivers.myVehicles(req.actor!);
  }

  @Get('ops/driver-applications')
  @UseGuards(IdentityGuard)
  listApplications(@Req() req: ReqWithActor) {
    return this.drivers.listApplications(req.actor!);
  }

  @Post('ops/driver-applications/:id/review')
  @UseGuards(IdentityGuard)
  reviewApplication(@Req() req: ReqWithActor, @Param('id') id: string, @Body() dto: ReviewDto) {
    return this.drivers.reviewApplication(req.actor!, id, dto.decision, dto.reason ?? null);
  }

  @Get('ops/vehicles')
  @UseGuards(IdentityGuard)
  listVehicles(@Req() req: ReqWithActor) {
    return this.drivers.listVehicles(req.actor!);
  }

  @Post('ops/vehicles/:id/review')
  @UseGuards(IdentityGuard)
  reviewVehicle(@Req() req: ReqWithActor, @Param('id') id: string, @Body() dto: ReviewDto) {
    return this.drivers.reviewVehicle(req.actor!, id, dto.decision);
  }
}

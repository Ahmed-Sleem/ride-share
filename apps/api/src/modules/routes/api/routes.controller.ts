/* Routes HTTP surface — thin. All logic lives in the application layer. */
import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { RoutesService } from '../application/routes.service.js';
import { IdentityGuard } from '../../../security/identity.guard.js';
import type { Actor } from '../../identity/contracts/types.js';

class CreateRouteDto {
  @IsOptional() @IsString() @MinLength(1) nameEn?: string;
  @IsOptional() @IsString() @MinLength(1) nameAr?: string;
  @IsOptional() @IsIn(['outbound', 'inbound']) direction?: 'outbound' | 'inbound';
  @IsInt() @Min(0) fareMinor!: number;
  @IsString() windowStart!: string;
  @IsString() windowEnd!: string;
  @IsInt() @Min(5) slotIntervalMin!: number;
}

class AddStopDto {
  @IsString() stopId!: string;
}

class ReorderDto {
  @IsArray() @IsString({ each: true }) orderedStopIds!: string[];
}

class GenerateSlotsDto {
  @IsString() fromDate!: string;
  @IsString() toDate!: string;
}

type ReqWithActor = FastifyRequest & { actor?: Actor };

@Controller()
export class RoutesController {
  constructor(private readonly routes: RoutesService) {}

  @Post('routes')
  @UseGuards(IdentityGuard)
  create(@Req() req: ReqWithActor, @Body() dto: CreateRouteDto) {
    return this.routes.createRoute(req.actor!, dto);
  }

  @Get('routes')
  @UseGuards(IdentityGuard)
  list(@Req() req: ReqWithActor) {
    return this.routes.list(req.actor!);
  }

  /** Riders see published routes + their boarding stops (P3.4/P3.5). */
  @Get('routes/published')
  @UseGuards(IdentityGuard)
  published(@Req() _req: ReqWithActor) {
    return this.routes.publishedWithStops();
  }

  @Get('routes/:id')
  @UseGuards(IdentityGuard)
  get(@Req() req: ReqWithActor, @Param('id') id: string) {
    return this.routes.get(req.actor!, id);
  }

  @Post('routes/:id/publish')
  @UseGuards(IdentityGuard)
  publish(@Req() req: ReqWithActor, @Param('id') id: string) {
    return this.routes.publish(req.actor!, id);
  }

  @Post('routes/:id/stops')
  @UseGuards(IdentityGuard)
  addStop(@Req() req: ReqWithActor, @Param('id') id: string, @Body() dto: AddStopDto) {
    return this.routes.addStop(req.actor!, id, dto.stopId);
  }

  @Post('routes/:id/reorder')
  @UseGuards(IdentityGuard)
  reorder(@Req() req: ReqWithActor, @Param('id') id: string, @Body() dto: ReorderDto) {
    return this.routes.reorder(req.actor!, id, dto.orderedStopIds);
  }

  @Post('routes/:id/slots')
  @UseGuards(IdentityGuard)
  generateSlots(@Req() req: ReqWithActor, @Param('id') id: string, @Body() dto: GenerateSlotsDto) {
    return this.routes.generateSlots(req.actor!, id, dto.fromDate, dto.toDate);
  }

  @Get('routes/:id/slots')
  @UseGuards(IdentityGuard)
  listSlots(@Req() req: ReqWithActor, @Param('id') id: string,
    @Query('from') from: string, @Query('to') to: string) {
    return this.routes.listSlots(req.actor!, id, from, to);
  }
}

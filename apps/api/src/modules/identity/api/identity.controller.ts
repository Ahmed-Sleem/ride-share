/* ══════════════════════════════════════════════════════════════════════
   Identity HTTP surface. Thin — all logic lives in the application layer.
   Unknown fields are rejected by the global validation pipe; errors carry
   translation keys (never prose) via the single exception filter.
   ══════════════════════════════════════════════════════════════════════ */
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { IdentityService } from '../application/identity.service.js';
import { IdentityGuard } from '../../../security/identity.guard.js';
import type { Actor, UserRole } from '../contracts/types.js';
import { STAFF_ROLES } from '../contracts/types.js';

class LoginDto {
  // phone OR email + password (owner choice). Minimum 3 chars to allow a
  // phone or an email; the service matches either column.
  @IsString() @MinLength(3) identifier!: string;
  @IsString() @MinLength(1) password!: string;
}

class OtpRequestDto {
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'validation.phone' }) phone!: string;
}

class OtpVerifyDto {
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'validation.phone' }) phone!: string;
  @Matches(/^[0-9]{6}$/, { message: 'validation.code' }) code!: string;
  @IsOptional() @IsString() @MinLength(1) name?: string;
}

class RefreshDto {
  @IsString() @MinLength(1) refreshToken!: string;
}

class ChangePasswordDto {
  @IsString() @MinLength(1) current!: string;
  @IsString() @MinLength(12) next!: string;
}

class CreateStaffDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @Matches(/^\+?[0-9]{8,15}$/, { message: 'validation.phone' }) phone?: string;
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsString() @MinLength(12) password!: string;
  @IsIn([...STAFF_ROLES]) role!: UserRole;
}

type ReqWithActor = FastifyRequest & { actor?: Actor };

@Controller()
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Post('auth/login')
  login(@Body() dto: LoginDto) {
    return this.identity.staffLogin(dto.identifier, dto.password);
  }

  @Post('auth/otp/request')
  requestOtp(@Body() dto: OtpRequestDto) {
    return this.identity.riderRequestOtp(dto.phone).then(() => ({ ok: true }));
  }

  @Post('auth/otp/verify')
  verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.identity.riderVerifyOtp(dto.phone, dto.code, dto.name);
  }

  @Post('auth/refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.identity.refresh(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(IdentityGuard)
  async me(@Req() req: ReqWithActor) {
    return { actor: req.actor };
  }

  @Post('me/password')
  @UseGuards(IdentityGuard)
  changePassword(@Req() req: ReqWithActor, @Body() dto: ChangePasswordDto) {
    return this.identity
      .changePassword(req.actor!.id, dto.current, dto.next)
      .then(() => ({ ok: true }));
  }

  @Post('admin/staff')
  @UseGuards(IdentityGuard)
  createStaff(@Req() req: ReqWithActor, @Body() dto: CreateStaffDto) {
    return this.identity.createStaff(req.actor!, {
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      name: dto.name,
      password: dto.password,
      role: dto.role,
    });
  }

  @Get('admin/staff')
  @UseGuards(IdentityGuard)
  listStaff(@Req() req: ReqWithActor) {
    return this.identity.listStaff(req.actor!);
  }
}

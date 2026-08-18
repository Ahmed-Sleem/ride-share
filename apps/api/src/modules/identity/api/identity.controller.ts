/* ══════════════════════════════════════════════════════════════════════
   Identity HTTP surface — thin. All logic lives in the application layer.
   Unknown fields are rejected by the global validation pipe; errors carry
   translation keys (never prose) via the single exception filter. Auth
   endpoints are rate-limited tighter than the global default (OWASP: login,
   OTP and reset are brute-force magnets).
   ══════════════════════════════════════════════════════════════════════ */
import {
  Body, Controller, Get, Post, Req, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { IdentityService } from '../application/identity.service.js';
import { IdentityGuard } from '../../../security/identity.guard.js';
import type { Actor, UserRole } from '../contracts/types.js';
import { STAFF_ROLES } from '../contracts/types.js';

class LoginDto {
  @IsString() @MinLength(3) identifier!: string;
  @IsString() @MinLength(1) password!: string;
}

class IdentifyDto {
  @IsString() @MinLength(3) identifier!: string;
}

class OtpRequestDto {
  @IsEmail({}, { message: 'validation.email' }) email!: string;
}

class OtpVerifyDto {
  @IsEmail({}, { message: 'validation.email' }) email!: string;
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

class EmailRequestDto {
  @IsEmail() email!: string;
}

class EmailVerifyDto {
  @Matches(/^[0-9]{6}$/, { message: 'validation.code' }) code!: string;
}

class ResetRequestDto {
  @IsString() @MinLength(3) identifier!: string;
}

class ResetConfirmDto {
  @IsString() @MinLength(3) identifier!: string;
  @Matches(/^[0-9]{6}$/, { message: 'validation.code' }) code!: string;
  @IsString() @MinLength(12) newPassword!: string;
}

type ReqWithActor = FastifyRequest & { actor?: Actor };

@Controller()
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Post('auth/login/identify')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  identify(@Body() dto: IdentifyDto) {
    return this.identity.identifyLogin(dto.identifier);
  }

  @Post('auth/login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  login(@Body() dto: LoginDto) {
    return this.identity.login(dto.identifier, dto.password);
  }

  @Post('auth/otp/request')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  requestOtp(@Body() dto: OtpRequestDto) {
    return this.identity.riderRequestOtp(dto.email);
  }

  @Post('auth/otp/verify')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.identity.riderVerifyOtp(dto.email, dto.code, dto.name);
  }

  @Post('auth/refresh')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  refresh(@Body() dto: RefreshDto) {
    return this.identity.refresh(dto.refreshToken);
  }

  @Post('auth/reset/request')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  requestReset(@Body() dto: ResetRequestDto) {
    return this.identity.requestPasswordReset(dto.identifier);
  }

  @Post('auth/reset/confirm')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  confirmReset(@Body() dto: ResetConfirmDto) {
    return this.identity.resetPassword(dto.identifier, dto.code, dto.newPassword);
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

  @Post('me/email/request')
  @UseGuards(IdentityGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  requestEmail(@Req() req: ReqWithActor, @Body() dto: EmailRequestDto) {
    return this.identity.requestEmailVerification(req.actor!, dto.email);
  }

  @Post('me/email/verify')
  @UseGuards(IdentityGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  verifyEmail(@Req() req: ReqWithActor, @Body() dto: EmailVerifyDto) {
    return this.identity.verifyEmail(req.actor!, dto.code);
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

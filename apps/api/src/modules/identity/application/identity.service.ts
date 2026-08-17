/* ══════════════════════════════════════════════════════════════════════
   Identity service — the application layer (use cases). Business rules stay
   in domain/; persistence in infra/. No business logic in HTTP handlers.
   ══════════════════════════════════════════════════════════════════════ */
import {
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { CONFIG, type Env } from '../../../config/env.js';
import { PinoLoggerService } from '../../../common/logging/logger.js';
import { hashPassword, verifyPassword } from '../domain/password.js';
import { hashToken, newRefreshToken, signAccessToken } from '../domain/token.js';
import { evaluateOtp, generateOtp, hashOtp, OTP_TTL_MS } from '../domain/otp.js';
import { STAFF_ROLES, toPublicUser, type PublicUser, type UserRole, type UserRow } from '../contracts/types.js';
import { UsersRepository } from '../infra/users.repository.js';
import { OtpRepository } from '../infra/otp.repository.js';
import { SessionsRepository } from '../infra/sessions.repository.js';
import { assertCan, Capability, Role } from '../../../security/authority/authority.resolver.js';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class IdentityService {
  constructor(
    @Inject(CONFIG) private readonly env: Env,
    private readonly logger: PinoLoggerService,
    private readonly users: UsersRepository,
    private readonly otps: OtpRepository,
    private readonly sessions: SessionsRepository
  ) {}

  /** Staff sign-in (email + password). Riders use OTP. */
  async staffLogin(email: string, password: string): Promise<AuthResult> {
    const user = await this.users.findByEmail(email);
    if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
      throw new UnauthorizedException({ message_key: 'auth.invalid_credentials' });
    }
    if (!STAFF_ROLES.includes(user.role)) {
      throw new UnauthorizedException({ message_key: 'auth.staff_only' });
    }
    if (user.status !== 'active') {
      throw new ForbiddenException({ message_key: 'auth.account_suspended' });
    }
    return this.issueTokens(user);
  }

  /** Rider: request a one-time code. */
  async riderRequestOtp(phone: string): Promise<void> {
    const code = generateOtp();
    await this.otps.upsert(phone, hashOtp(code), new Date(Date.now() + OTP_TTL_MS));
    this.deliverOtp(phone, code);
  }

  /** Rider: verify the code; creates the rider on first use (self-register). */
  async riderVerifyOtp(phone: string, code: string, name?: string): Promise<AuthResult> {
    const record = await this.otps.findByPhone(phone);
    if (!record) throw new UnauthorizedException({ message_key: 'auth.otp_invalid' });

    const result = evaluateOtp(record, code, new Date());
    if (!result.ok) {
      if (result.reason !== 'mismatch') {
        await this.otps.delete(record.id);
      } else {
        await this.otps.incrementAttempts(record.id);
      }
      throw new UnauthorizedException({ message_key: `auth.otp_${result.reason}` });
    }

    await this.otps.delete(record.id);
    const existing = await this.users.findByPhone(phone);
    const user = existing ?? (await this.users.create({ phone, name, role: 'rider' }));
    if (user.status !== 'active') {
      throw new ForbiddenException({ message_key: 'auth.account_suspended' });
    }
    return this.issueTokens(user);
  }

  /** Exchange a valid refresh token for a fresh pair (rotates the session). */
  async refresh(refreshToken: string): Promise<AuthResult> {
    const session = await this.sessions.findValid(hashToken(refreshToken));
    if (!session) throw new UnauthorizedException({ message_key: 'auth.session_invalid' });
    await this.sessions.revoke(session.id);
    return this.issueTokens(session.user);
  }

  async changePassword(userId: string, current: string, next: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user || !user.password_hash || !verifyPassword(current, user.password_hash)) {
      throw new UnauthorizedException({ message_key: 'auth.invalid_credentials' });
    }
    await this.users.setPassword(userId, hashPassword(next));
  }

  /** Super-admin creates a staff account (never self-service — DEC-032/033). */
  async createStaff(actor: { role: UserRole }, email: string, password: string, role: UserRole): Promise<PublicUser> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_STAFF);
    if (!STAFF_ROLES.includes(role)) {
      throw new ForbiddenException({ message_key: 'auth.staff_roles_only' });
    }
    const existing = await this.users.findByEmail(email);
    if (existing) throw new ForbiddenException({ message_key: 'auth.email_taken' });
    const created = await this.users.create({ email, role, passwordHash: hashPassword(password) });
    return toPublicUser(created);
  }

  async listStaff(actor: { role: UserRole }): Promise<PublicUser[]> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_STAFF);
    const all = await this.users.list();
    return all.filter((u) => STAFF_ROLES.includes(u.role)).map(toPublicUser);
  }

  // ── internals ───────────────────────────────────────────────────────────
  private async issueTokens(user: UserRow): Promise<AuthResult> {
    const accessToken = await signAccessToken(this.env.JWT_SECRET, user.id, user.role);
    const refreshToken = newRefreshToken();
    await this.sessions.create(
      user.id,
      hashToken(refreshToken),
      new Date(Date.now() + REFRESH_TTL_MS)
    );
    return { user: toPublicUser(user), accessToken, refreshToken };
  }

  /**
   * OTP transport. Development logs the code server-side (real dev affordance,
   * documented); production without an SMS provider refuses — no fake success.
   * This is the ONE seam an SMS provider (Twilio/Unifonic/…) plugs into later.
   */
  private deliverOtp(phone: string, code: string): void {
    if (this.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException({
        message_key: 'notifications.sms_not_configured',
        details: { phone },
      });
    }
    this.logger.warn(`[DEV-OTP] code for ${phone}: ${code}`);
  }
}

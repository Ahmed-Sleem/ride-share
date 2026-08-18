/* ══════════════════════════════════════════════════════════════════════
   Identity service — the application layer (use cases). Business rules stay
   in domain/; persistence in infra/. No business logic in HTTP handlers.
   Verification & recovery (DEC-189): resend cooldown (>= 60s), 3 failed
   attempts → 1-hour lockout, email verification, password reset (no user
   enumeration), all enforced against the domain rules in verification.ts.
   ══════════════════════════════════════════════════════════════════════ */
import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CONFIG, type Env } from '../../../config/env.js';
import { hashPassword, verifyPassword } from '../domain/password.js';
import { hashToken, newRefreshToken, signAccessToken } from '../../../security/token.js';
import {
  canResend, CODE_TTL_MS, evaluateCode, generateCode, hashCode,
  LOCKOUT_MS, RESEND_COOLDOWN_MS, type VerificationChannel,
} from '../domain/verification.js';
import { STAFF_ROLES, toPublicUser, type Actor, type PublicUser, type UserRole, type UserRow } from '../contracts/types.js';
import { UsersRepository } from '../infra/users.repository.js';
import { VerificationsRepository } from '../infra/verifications.repository.js';
import { SessionsRepository } from '../infra/sessions.repository.js';
import { Notifications } from '../infra/notifications.js';
import { AuditService } from '../../audit/contracts/public.js';
import { assertCan, Capability, Role } from '../../../security/authority/authority.resolver.js';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

const tooMany = (messageKey: string, details?: unknown) =>
  new HttpException({ message_key: messageKey, details }, HttpStatus.TOO_MANY_REQUESTS);

@Injectable()
export class IdentityService {
  constructor(
    @Inject(CONFIG) private readonly env: Env,
    private readonly users: UsersRepository,
    private readonly codes: VerificationsRepository,
    private readonly sessions: SessionsRepository,
    private readonly notifications: Notifications,
    private readonly audit: AuditService
  ) {}

  /** Smart sign-in step 1 — identify the account without revealing whether
      staff or rider: a password account gets 'password', an OTP-only account
      gets 'otp' AND has a code sent (cooldown applies). Unknown identifiers
      are a 401, exactly like a wrong password — no enumeration. */
  async identifyLogin(identifier: string): Promise<{ method: 'password' | 'otp'; resendInMs?: number; target?: string }> {
    const user = await this.users.findByIdentifier(identifier);
    if (!user) throw new UnauthorizedException({ message_key: 'auth.invalid_credentials' });
    if (user.status !== 'active') throw new ForbiddenException({ message_key: 'auth.account_suspended' });
    if (user.password_hash) return { method: 'password' };
    // OTP-only account (rider / driver): send a login code now.
    const phone = user.phone;
    if (!phone) throw new UnauthorizedException({ message_key: 'auth.invalid_credentials' });
    const existing = await this.codes.findActive('sms_login', 'sms', phone);
    const resend = canResend(existing, new Date());
    if (!resend.ok) {
      if (resend.reason === 'locked') throw tooMany('auth.code_locked', { lockedUntil: resend.lockedUntil });
      throw tooMany('auth.resend_wait', { retryAfterMs: resend.retryAfterMs });
    }
    const code = generateCode();
    await this.codes.upsert({
      kind: 'sms_login', channel: 'sms', target: phone,
      codeHash: hashCode(code), expiresAt: new Date(Date.now() + CODE_TTL_MS.sms_login),
    });
    await this.notifications.sendOtp(phone, code);
    return { method: 'otp', resendInMs: RESEND_COOLDOWN_MS, target: phone };
  }

  /** Smart sign-in step 2 — password path. Staff (and any password account). */
  async login(identifier: string, password: string): Promise<AuthResult> {
    const user = await this.users.findByIdentifier(identifier);
    if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
      throw new UnauthorizedException({ message_key: 'auth.invalid_credentials' });
    }
    if (user.status !== 'active') {
      throw new ForbiddenException({ message_key: 'auth.account_suspended' });
    }
    return this.issueTokens(user);
  }

  /** Rider: request a one-time code (>= 60s between sends; 3 fails → 1h lock). */
  async riderRequestOtp(phone: string): Promise<{ ok: true; resendInMs: number }> {
    const existing = await this.codes.findActive('sms_login', 'sms', phone);
    const resend = canResend(existing, new Date());
    if (!resend.ok) {
      if (resend.reason === 'locked') throw tooMany('auth.code_locked', { lockedUntil: resend.lockedUntil });
      throw tooMany('auth.resend_wait', { retryAfterMs: resend.retryAfterMs });
    }
    const code = generateCode();
    await this.codes.upsert({
      kind: 'sms_login', channel: 'sms', target: phone,
      codeHash: hashCode(code), expiresAt: new Date(Date.now() + CODE_TTL_MS.sms_login),
    });
    await this.notifications.sendOtp(phone, code);
    return { ok: true, resendInMs: RESEND_COOLDOWN_MS };
  }

  /** Rider: verify the code; creates the rider on first use (self-register). */
  async riderVerifyOtp(phone: string, code: string, name?: string): Promise<AuthResult> {
    const record = await this.codes.findActive('sms_login', 'sms', phone);
    const result = evaluateCode(record, code, new Date());
    if (!result.ok) {
      if (result.reason === 'mismatch' && record) {
        await this.codes.incrementAttempts(record.id);
        const attempts = record.attempts + 1;
        if (attempts >= 3) throw tooMany('auth.code_locked', { lockedUntil: new Date(Date.now() + LOCKOUT_MS) });
        throw new UnauthorizedException({
          message_key: 'auth.otp_mismatch', details: { remainingAttempts: 3 - attempts },
        });
      }
      if (result.reason === 'locked') throw tooMany('auth.code_locked', { lockedUntil: result.lockedUntil });
      throw new UnauthorizedException({ message_key: `auth.otp_${result.reason}` });
    }

    await this.codes.markConsumed(record!.id);
    const existing = await this.users.findByPhone(phone);
    const user = existing ?? (await this.users.create({ phone, name, role: 'rider' }));
    if (user.status !== 'active') {
      throw new ForbiddenException({ message_key: 'auth.account_suspended' });
    }
    return this.issueTokens(user);
  }

  /** Request an email verification code (>= 60s between sends). */
  async requestEmailVerification(actor: Actor, email: string): Promise<{ ok: true; resendInMs: number }> {
    const taken = await this.users.findByEmail(email);
    if (taken && taken.id !== actor.id) {
      throw new ForbiddenException({ message_key: 'auth.email_taken' });
    }
    const existing = await this.codes.findActive('email_verify', 'email', email);
    const resend = canResend(existing, new Date());
    if (!resend.ok) {
      if (resend.reason === 'locked') throw tooMany('auth.code_locked', { lockedUntil: resend.lockedUntil });
      throw tooMany('auth.resend_wait', { retryAfterMs: resend.retryAfterMs });
    }
    await this.users.setEmail(actor.id, email);
    const code = generateCode();
    await this.codes.upsert({
      kind: 'email_verify', channel: 'email', target: email,
      codeHash: hashCode(code), expiresAt: new Date(Date.now() + CODE_TTL_MS.email_verify),
    });
    await this.notifications.sendVerification(email, code);
    return { ok: true, resendInMs: RESEND_COOLDOWN_MS };
  }

  /** Verify the emailed code and mark the address verified. */
  async verifyEmail(actor: Actor, code: string): Promise<{ ok: true }> {
    const user = await this.users.findById(actor.id);
    if (!user?.email) throw new UnauthorizedException({ message_key: 'auth.email_not_set' });
    const record = await this.codes.findActive('email_verify', 'email', user.email);
    const result = evaluateCode(record, code, new Date());
    if (!result.ok) {
      if (result.reason === 'mismatch' && record) {
        await this.codes.incrementAttempts(record.id);
        if (record.attempts + 1 >= 3) throw tooMany('auth.code_locked', { lockedUntil: new Date(Date.now() + LOCKOUT_MS) });
        throw new UnauthorizedException({ message_key: 'auth.otp_mismatch' });
      }
      throw new UnauthorizedException({ message_key: `auth.otp_${result.reason}` });
    }
    await this.codes.markConsumed(record!.id);
    await this.users.markEmailVerified(actor.id);
    return { ok: true };
  }

  /** Password reset — step 1. NEVER reveals whether the account exists. */
  async requestPasswordReset(identifier: string): Promise<{ ok: true }> {
    const user = await this.users.findByIdentifier(identifier);
    if (!user) return { ok: true };
    const channel = this.channelFor(user);
    if (!channel) return { ok: true };
    const target = channel === 'email' ? user.email! : user.phone!;
    const existing = await this.codes.findActive('password_reset', channel, target);
    const resend = canResend(existing, new Date());
    if (!resend.ok) return { ok: true }; // keep cooldown opaque to avoid enumeration timing
    const code = generateCode();
    await this.codes.upsert({
      kind: 'password_reset', channel, target,
      codeHash: hashCode(code), expiresAt: new Date(Date.now() + CODE_TTL_MS.password_reset),
    });
    if (channel === 'email') await this.notifications.sendPasswordReset(target, code);
    else await this.notifications.sendReset(target, code);
    return { ok: true };
  }

  /** Password reset — step 2. Verifies the code, sets the new password,
      and revokes every session (the account is logged out everywhere). */
  async resetPassword(identifier: string, code: string, newPassword: string): Promise<{ ok: true }> {
    const user = await this.users.findByIdentifier(identifier);
    if (!user) throw new UnauthorizedException({ message_key: 'auth.reset_invalid' });
    const channel = this.channelFor(user);
    if (!channel) throw new UnauthorizedException({ message_key: 'auth.reset_invalid' });
    const target = channel === 'email' ? user.email! : user.phone!;
    const record = await this.codes.findActive('password_reset', channel, target);
    const result = evaluateCode(record, code, new Date());
    if (!result.ok) {
      if (result.reason === 'mismatch' && record) {
        await this.codes.incrementAttempts(record.id);
        if (record.attempts + 1 >= 3) throw tooMany('auth.code_locked', { lockedUntil: new Date(Date.now() + LOCKOUT_MS) });
        throw new UnauthorizedException({ message_key: 'auth.otp_mismatch' });
      }
      throw new UnauthorizedException({ message_key: 'auth.reset_invalid' });
    }
    await this.codes.markConsumed(record!.id);
    await this.users.setPassword(user.id, hashPassword(newPassword));
    await this.sessions.revokeAllForUser(user.id);
    await this.audit.record({ id: user.id, role: user.role }, 'auth.password_reset', {
      targetType: 'user', targetId: user.id,
    });
    return { ok: true };
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
    await this.sessions.revokeAllForUser(userId);
    await this.audit.record({ id: userId, role: user.role }, 'auth.change_password', {
      targetType: 'user', targetId: userId,
    });
  }

  /** Super-admin creates a staff account (never self-service — DEC-032/033). */
  async createStaff(
    actor: Actor,
    input: { phone?: string | null; email?: string | null; name?: string; password: string; role: UserRole }
  ): Promise<PublicUser> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_STAFF);
    if (!STAFF_ROLES.includes(input.role)) {
      throw new ForbiddenException({ message_key: 'auth.staff_roles_only' });
    }
    if (!input.phone && !input.email) {
      throw new ForbiddenException({ message_key: 'auth.identifier_required' });
    }
    if (input.email && (await this.users.findByEmail(input.email))) {
      throw new ForbiddenException({ message_key: 'auth.email_taken' });
    }
    if (input.phone && (await this.users.findByPhone(input.phone))) {
      throw new ForbiddenException({ message_key: 'auth.phone_taken' });
    }
    const created = await this.users.create({
      email: input.email ?? null,
      phone: input.phone ?? null,
      name: input.name,
      role: input.role,
      passwordHash: hashPassword(input.password),
    });
    await this.audit.record(actor, 'staff.create', {
      targetType: 'user', targetId: created.id, after: { email: created.email, phone: created.phone, role: created.role },
    });
    return toPublicUser(created);
  }

  async listStaff(actor: Actor): Promise<PublicUser[]> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_STAFF);
    const all = await this.users.list();
    return all.filter((u) => STAFF_ROLES.includes(u.role)).map(toPublicUser);
  }

  // ── internals ───────────────────────────────────────────────────────────
  private channelFor(user: UserRow): VerificationChannel | null {
    if (user.email) return 'email';
    if (user.phone) return 'sms';
    return null;
  }

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
}

/* Identity service tests — repository fakes, no database. Proves the rules:
   staff password login, rider EMAIL OTP self-register, the email-domain
   allowlist, resend cooldown (60s), 3-attempt lockout (1h), session rotation,
   change password, email verification, password reset (no enumeration),
   audit events, and §8.2 authority. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import { IdentityService } from './identity.service.js';
import { hashPassword, verifyPassword } from '../domain/password.js';
import { MAX_ATTEMPTS, type VerificationChannel, type VerificationKind, type VerificationRecord } from '../domain/verification.js';
import type { UserRow } from '../contracts/types.js';
import type { Env } from '../../../config/env.js';

class FakeUsers {
  rows = new Map<string, UserRow>();
  seq = 0;
  async findByEmail(email: string) { return [...this.rows.values()].find((u) => u.email === email && !u.deleted_at) ?? null; }
  async findByIdentifier(id: string) { return [...this.rows.values()].find((u) => (u.email === id || u.phone === id) && !u.deleted_at) ?? null; }
  async findByPhone(phone: string) { return [...this.rows.values()].find((u) => u.phone === phone && !u.deleted_at) ?? null; }
  async findById(id: string) { const u = this.rows.get(id); return u && !u.deleted_at ? u : null; }
  async create(input: { email?: string | null; phone?: string | null; name?: string; role: string; passwordHash?: string | null; isSystemAdmin?: boolean }) {
    const id = `u${++this.seq}`;
    const row: UserRow = {
      id, email: input.email ?? null, phone: input.phone ?? null, name: input.name ?? '',
      role: input.role as UserRow['role'], password_hash: input.passwordHash ?? null,
      status: 'active', email_verified_at: null,
      is_system_admin: input.isSystemAdmin ?? false, deleted_at: null, created_at: new Date(),
    };
    this.rows.set(id, row);
    return row;
  }
  async setPassword(id: string, h: string) { const u = this.rows.get(id); if (u) this.rows.set(id, { ...u, password_hash: h }); }
  async setEmail(id: string, email: string) { const u = this.rows.get(id); if (u) this.rows.set(id, { ...u, email, email_verified_at: null }); }
  async markEmailVerified(id: string) { const u = this.rows.get(id); if (u) this.rows.set(id, { ...u, email_verified_at: new Date() }); }
  async markSystemAdmin(id: string) { const u = this.rows.get(id); if (u) this.rows.set(id, { ...u, is_system_admin: true }); }
  async softDelete(id: string) { const u = this.rows.get(id); if (u) this.rows.set(id, { ...u, deleted_at: new Date() }); }
  async updateStaff(id: string, name: string, role: string) { const u = this.rows.get(id); if (u) this.rows.set(id, { ...u, name, role: role as UserRow['role'] }); }
  async list() { return [...this.rows.values()].filter((u) => !u.deleted_at); }
  async countByRole(role: string) { return [...this.rows.values()].filter((u) => u.role === role && !u.deleted_at).length; }
}

class FakeCodes {
  store = new Map<string, VerificationRecord>();
  async findActive(kind: VerificationKind, channel: VerificationChannel, target: string) {
    return this.store.get(`${kind}:${channel}:${target}`) ?? null;
  }
  async upsert(input: { kind: VerificationKind; channel: VerificationChannel; target: string; codeHash: string; expiresAt: Date }) {
    this.store.set(`${input.kind}:${input.channel}:${input.target}`, {
      id: 'c1', kind: input.kind, channel: input.channel, target: input.target,
      codeHash: input.codeHash, attempts: 0, lastSentAt: new Date(), lastAttemptAt: null,
      expiresAt: input.expiresAt, consumedAt: null,
    });
  }
  async incrementAttempts(id: string) {
    // Faithful to the real repo: the UPDATE replaces the row; the previously
    // fetched record object must NOT change (the service reads record.attempts
    // from its own snapshot before/after incrementing).
    for (const [key, v] of [...this.store]) {
      if (v.id === id) this.store.set(key, { ...v, attempts: v.attempts + 1, lastAttemptAt: new Date() });
    }
  }
  async markConsumed(id: string) { for (const v of this.store.values()) if (v.id === id) v.consumedAt = new Date(); }
  async deleteFor(kind: VerificationKind, channel: VerificationChannel, target: string) {
    this.store.delete(`${kind}:${channel}:${target}`);
  }
  seed(kind: VerificationKind, channel: VerificationChannel, target: string, codeHash: string, over: Partial<VerificationRecord> = {}) {
    this.store.set(`${kind}:${channel}:${target}`, {
      id: 'c1', kind, channel, target, codeHash, attempts: 0,
      lastSentAt: new Date(Date.now() - 120_000), lastAttemptAt: null,
      expiresAt: new Date(Date.now() + 60_000), consumedAt: null, ...over,
    });
  }
}

class FakeSessions {
  store = new Map<string, { id: string; user: UserRow }>();
  seq = 0;
  constructor(private readonly users: FakeUsers) {}
  async create(userId: string, tokenHash: string, _e: Date) {
    this.store.set(tokenHash, { id: `s${++this.seq}`, user: this.users.rows.get(userId)! });
  }
  async findValid(tokenHash: string) { return this.store.get(tokenHash) ?? null; }
  async revoke(id: string) { for (const [key, v] of this.store) if (v.id === id) this.store.delete(key); }
  async revokeAllForUser(userId: string) { for (const [key, v] of this.store) if (v.user.id === userId) this.store.delete(key); }
  countFor(userId: string) { return [...this.store.values()].filter((v) => v.user.id === userId).length; }
}

class FakeNotifications {
  calls: string[] = [];
  codes: string[] = [];
  async sendLoginCode(email: string, code: string) { this.calls.push(`login:${email}`); this.codes.push(code); }
  async sendVerification(email: string, code: string) { this.calls.push(`verify:${email}`); this.codes.push(code); }
  async sendPasswordReset(email: string, code: string) { this.calls.push(`reset-mail:${email}`); this.codes.push(code); }
}

class FakeAudit { entries: unknown[] = []; async record(...a: unknown[]) { this.entries.push(a); } async list() { return []; } }

function env(over: Partial<Record<'AUTH_OTP_BYPASS', 'true' | 'false'>> = {}): Env {
  return {
    NODE_ENV: 'development', PORT: 3000, LOG_LEVEL: 'info', DATABASE_URL: 'postgres://localhost/x',
    JWT_SECRET: 'c'.repeat(32), CORS_ORIGINS: '', THROTTLE_TTL: 60000, THROTTLE_LIMIT: 100,
    SMTP_PORT: 587, SMTP_SECURE: 'false', AUTO_MIGRATE: 'true', EMAIL_ALLOWED_DOMAINS: '',
    AUTH_OTP_BYPASS: over.AUTH_OTP_BYPASS ?? 'false',
  } as Env;
}

function setup(over: Partial<Record<'AUTH_OTP_BYPASS', 'true' | 'false'>> = {}) {
  const users = new FakeUsers();
  const codes = new FakeCodes();
  const sessions = new FakeSessions(users);
  const notifications = new FakeNotifications();
  const audit = new FakeAudit();
  const svc = new IdentityService(env(over), users as never, codes as never, sessions as never, notifications as never, audit as never);
  return { svc, users, codes, sessions, notifications, audit };
}

test('staff login succeeds with correct password', async () => {
  const { svc, users } = setup();
  await users.create({ email: 'admin@x.com', role: 'super_admin', passwordHash: hashPassword('pw-12345678') });
  const res = await svc.login('admin@x.com', 'pw-12345678');
  assert.equal(res.user.role, 'super_admin');
  assert.ok(res.accessToken.length > 20);
});

test('staff login rejects a wrong password with a translation key', async () => {
  const { svc, users } = setup();
  await users.create({ email: 'admin@x.com', role: 'super_admin', passwordHash: hashPassword('pw-12345678') });
  await assert.rejects(() => svc.login('admin@x.com', 'wrong'), UnauthorizedException);
});

test('identify returns password method for staff, otp for riders (email)', async () => {
  const { svc, users, notifications } = setup();
  await users.create({ email: 'admin@x.com', role: 'super_admin', passwordHash: hashPassword('pw-12345678') });
  await users.create({ email: 'rider@gmail.com', role: 'rider' });
  assert.deepEqual(await svc.identifyLogin('admin@x.com'), { method: 'password' });
  const otp = await svc.identifyLogin('rider@gmail.com');
  assert.equal(otp.method, 'otp');
  assert.ok((otp as { resendInMs: number }).resendInMs > 0);
  assert.equal(notifications.calls.length, 1, 'a login code was emailed');
});

test('identify for an unknown identifier is a 401 (no enumeration)', async () => {
  const { svc } = setup();
  await assert.rejects(() => svc.identifyLogin('ghost@gmail.com'), UnauthorizedException);
});

test('rider OTP: request then signup-verify self-registers by email (audited)', async () => {
  const { svc, notifications, audit } = setup();
  const email = 'ahmed@ejust.edu.eg';
  const req = await svc.riderRequestOtp(email);
  assert.equal(req.ok, true);
  assert.equal(req.resendInMs, 60000);
  assert.equal(notifications.codes.length, 1);
  const res = await svc.signupVerifyOtp(email, notifications.codes[0]!);
  assert.equal(res.user.role, 'rider');
  assert.equal(res.user.email, email);
  const actions = audit.entries.map((e) => (e as [unknown, string])[1]);
  assert.ok(actions.includes('auth.otp_request'), 'otp request audited');
  assert.ok(actions.includes('auth.signup'), 'signup audited');
});

test('sign-up is refused when the email already exists (one email = one account)', async () => {
  const { svc, users, notifications } = setup();
  await users.create({ email: 'rider@gmail.com', role: 'rider' });
  // (1) at code request — before anything is sent
  await assert.rejects(() => svc.riderRequestOtp('rider@gmail.com'), (e: unknown) =>
    e instanceof ForbiddenException && JSON.stringify((e as HttpException).getResponse()).includes('auth.email_taken'));
  assert.equal(notifications.calls.length, 0, 'no code sent to a taken email');
  // (2) at verify — a raced code still cannot create a second account
  const existing = await svc.identifyLogin('rider@gmail.com'); // sends the code for the existing account
  assert.equal(existing.method, 'otp');
  await assert.rejects(() => svc.signupVerifyOtp('rider@gmail.com', notifications.codes[0]!, 'X'), (e: unknown) =>
    e instanceof ForbiddenException && JSON.stringify((e as HttpException).getResponse()).includes('auth.email_taken'));
});

test('sign-in verify refuses a non-existent account (sign-up is separate)', async () => {
  const { svc } = setup();
  await assert.rejects(() => svc.riderVerifyOtp('ghost@gmail.com', '123456'), UnauthorizedException);
});

test('temporary-mail domains are refused before any email is sent', async () => {
  const { svc, notifications } = setup();
  for (const email of ['fetajav577@playboot.com', 'a@mailinator.com', 'a@10minutemail.com']) {
    await assert.rejects(
      () => svc.riderRequestOtp(email),
      (e: unknown) => e instanceof ForbiddenException &&
        JSON.stringify((e as HttpException).getResponse()).includes('auth.email_domain_not_allowed'),
      `expected refusal for ${email}`
    );
  }
  assert.equal(notifications.calls.length, 0, 'no code was sent to a disposable mailbox');
});

test('unknown corporate domains are refused; env-extended domains pass', async () => {
  const { svc } = setup();
  await assert.rejects(() => svc.riderRequestOtp('a@randomcorp.com'), ForbiddenException);
  // extension via EMAIL_ALLOWED_DOMAINS
  const envX = env();
  (envX as { EMAIL_ALLOWED_DOMAINS: string }).EMAIL_ALLOWED_DOMAINS = 'mycompany.eg';
  const users = new FakeUsers(); const codes = new FakeCodes(); const sessions = new FakeSessions(users);
  const notifications = new FakeNotifications(); const audit = new FakeAudit();
  const svc2 = new IdentityService(envX, users as never, codes as never, sessions as never, notifications as never, audit as never);
  const req = await svc2.riderRequestOtp('a@mycompany.eg');
  assert.equal(req.ok, true);
});

test('resend within 60s is rejected with 429 and retryAfterMs', async () => {
  const { svc } = setup();
  void (await svc.riderRequestOtp('rider@gmail.com'));
  await assert.rejects(() => svc.riderRequestOtp('rider@gmail.com'), (e: unknown) => {
    return e instanceof HttpException && e.getStatus() === 429 &&
      JSON.stringify(e.getResponse()).includes('auth.resend_wait');
  });
});

test('3 wrong attempts lock the code for 1 hour', async () => {
  const { svc } = setup();
  const email = 'rider@gmail.com';
  await svc.riderRequestOtp(email);
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const expectLock = i === MAX_ATTEMPTS - 1;
    await assert.rejects(() => svc.riderVerifyOtp(email, '000000'), expectLock ? HttpException : UnauthorizedException);
  }
  await assert.rejects(() => svc.riderRequestOtp(email), (e: unknown) => {
    return e instanceof HttpException && e.getStatus() === 429 &&
      JSON.stringify(e.getResponse()).includes('auth.code_locked');
  });
});

test('refresh rotates the session', async () => {
  const { svc, users } = setup();
  await users.create({ email: 'admin@x.com', role: 'super_admin', passwordHash: hashPassword('pw-12345678') });
  const first = await svc.login('admin@x.com', 'pw-12345678');
  const second = await svc.refresh(first.refreshToken);
  assert.equal(second.user.role, 'super_admin');
  await assert.rejects(() => svc.refresh(first.refreshToken), UnauthorizedException);
});

test('change password revokes all sessions', async () => {
  const { svc, users, sessions } = setup();
  const u = await users.create({ email: 'admin@x.com', role: 'super_admin', passwordHash: hashPassword('old-12345678') });
  await svc.login('admin@x.com', 'old-12345678');
  assert.equal(sessions.countFor(u.id), 1);
  await svc.changePassword(u.id, 'old-12345678', 'new-12345678');
  assert.equal(verifyPassword('new-12345678', users.rows.get(u.id)!.password_hash!), true);
  assert.equal(sessions.countFor(u.id), 0);
});

test('email verification: request, then verify, marks verified', async () => {
  const { svc, users, notifications } = setup();
  const u = await users.create({ email: 'rider@gmail.com', role: 'rider' });
  const actor = { id: u.id, role: 'rider' as const };
  await svc.requestEmailVerification(actor, 'rider@gmail.com');
  assert.equal(notifications.codes.length, 1);
  await svc.verifyEmail(actor, notifications.codes[0]!);
  assert.equal(users.rows.get(u.id)!.email_verified_at !== null, true);
});

test('password reset: request never reveals existence, confirm resets + revokes', async () => {
  const { svc, users, notifications, sessions } = setup();
  await svc.requestPasswordReset('nobody@gmail.com'); // no user — still ok
  assert.equal(notifications.calls.length, 0);

  const u = await users.create({ email: 'admin@x.com', role: 'super_admin', passwordHash: hashPassword('pw-12345678') });
  await svc.login('admin@x.com', 'pw-12345678');
  await svc.requestPasswordReset('admin@x.com');
  assert.equal(notifications.calls.includes('reset-mail:admin@x.com'), true);
  const code = notifications.codes[notifications.codes.length - 1]!;
  await svc.resetPassword('admin@x.com', code, 'new-password-123');
  assert.equal(verifyPassword('new-password-123', users.rows.get(u.id)!.password_hash!), true);
  assert.equal(sessions.countFor(u.id), 0);
});

test('resetPassword rejects a wrong code', async () => {
  const { svc, users } = setup();
  await users.create({ email: 'admin@x.com', role: 'super_admin', passwordHash: hashPassword('pw-12345678') });
  await svc.requestPasswordReset('admin@x.com');
  await assert.rejects(() => svc.resetPassword('admin@x.com', '000000', 'new-password-123'), UnauthorizedException);
});

test('a rider actor cannot create staff accounts (§8.2 — authority in one place)', async () => {
  const { svc, users } = setup();
  await users.create({ email: 'rider@gmail.com', role: 'rider' });
  await assert.rejects(
    () => svc.createStaff({ id: 'r1', role: 'rider' }, { email: 'new@x.com', password: 'pw-12345678', role: 'manager' }),
    ForbiddenException
  );
});

test('super_admin creates a staff account (phone + email both accepted, audited)', async () => {
  const { svc, users, audit } = setup();
  await users.create({ email: 'boss@x.com', role: 'super_admin', passwordHash: hashPassword('pw-12345678') });
  const created = await svc.createStaff(
    { id: 'a1', role: 'super_admin' },
    { phone: '+201234567890', email: 'ops@x.com', name: 'Ops', password: 'pw-12345678', role: 'operations' }
  );
  assert.equal(created.role, 'operations');
  assert.ok(audit.entries.length >= 1, 'staff creation is audited');
});

test('staff login accepts phone OR email as identifier', async () => {
  const { svc, users } = setup();
  await users.create({ email: 'admin@x.com', phone: '+201111111111', role: 'super_admin', passwordHash: hashPassword('pw-12345678') });
  const byEmail = await svc.login('admin@x.com', 'pw-12345678');
  const byPhone = await svc.login('+201111111111', 'pw-12345678');
  assert.equal(byEmail.user.id, byPhone.user.id);
});

test('no second super_admin can be created (DEC-196 — one main admin)', async () => {
  const { svc, users } = setup();
  await users.create({ email: 'boss@x.com', role: 'super_admin', passwordHash: hashPassword('pw-12345678'), isSystemAdmin: true });
  await assert.rejects(
    () => svc.createStaff({ id: 'a1', role: 'super_admin' }, { email: 'x@x.com', password: 'pw-12345678', role: 'super_admin' }),
    (e: unknown) => e instanceof ForbiddenException && JSON.stringify((e as HttpException).getResponse()).includes('auth.super_admin_reserved')
  );
});

test('the system admin is immutable — cannot be edited or deleted by anyone', async () => {
  const { svc, users } = setup();
  const main = await users.create({ email: 'root@x.com', role: 'super_admin', passwordHash: hashPassword('pw-12345678'), isSystemAdmin: true });
  const actor = { id: main.id, role: 'super_admin' as const };
  await assert.rejects(() => svc.updateStaff(actor, main.id, { name: 'Hacker' }), (e: unknown) =>
    e instanceof ForbiddenException && JSON.stringify((e as HttpException).getResponse()).includes('auth.main_admin_protected'));
  await assert.rejects(() => svc.deleteStaff(actor, main.id), (e: unknown) =>
    e instanceof ForbiddenException && JSON.stringify((e as HttpException).getResponse()).includes('auth.main_admin_protected'));
});

test('the system admin edits and deletes other staff accounts', async () => {
  const { svc, users } = setup();
  const main = await users.create({ email: 'root@x.com', role: 'super_admin', passwordHash: hashPassword('pw-12345678'), isSystemAdmin: true });
  const actor = { id: main.id, role: 'super_admin' as const };
  const ops = await svc.createStaff(actor, { email: 'ops@x.com', password: 'pw-12345678', role: 'operations' });
  const updated = await svc.updateStaff(actor, ops.id, { name: 'Ops Lead', role: 'manager' });
  assert.equal(updated.name, 'Ops Lead');
  assert.equal(updated.role, 'manager');
  await svc.deleteStaff(actor, ops.id);
  // soft-deleted staff can no longer be looked up (deleted_at hidden)
  assert.equal(users.rows.get(ops.id)!.deleted_at !== null, true);
  assert.equal(await users.findById(ops.id), null);
});

test('a staff role cannot be edited into super_admin', async () => {
  const { svc, users } = setup();
  const main = await users.create({ email: 'root@x.com', role: 'super_admin', passwordHash: hashPassword('pw-12345678'), isSystemAdmin: true });
  const actor = { id: main.id, role: 'super_admin' as const };
  const ops = await svc.createStaff(actor, { email: 'ops@x.com', password: 'pw-12345678', role: 'operations' });
  await assert.rejects(() => svc.updateStaff(actor, ops.id, { role: 'super_admin' }), (e: unknown) =>
    e instanceof ForbiddenException && JSON.stringify((e as HttpException).getResponse()).includes('auth.super_admin_reserved'));
});

test('OTP bypass: signup creates an account without a code (no email sent)', async () => {
  const { svc, notifications, users } = setup({ AUTH_OTP_BYPASS: 'true' });
  const req = await svc.riderRequestOtp('rider@gmail.com');
  assert.equal(req.bypass, true);
  assert.equal(notifications.calls.length, 0, 'no code is sent in bypass mode');
  const res = await svc.signupVerifyOtp('rider@gmail.com', '', 'Nour');
  assert.equal(res.user.role, 'rider');
  assert.equal(res.user.email, 'rider@gmail.com');
  assert.equal(users.rows.get(res.user.id)!.name, 'Nour');
});

test('OTP bypass: sign-in works without a code for an existing account', async () => {
  const { svc, users } = setup({ AUTH_OTP_BYPASS: 'true' });
  await users.create({ email: 'rider@gmail.com', role: 'rider' });
  const id = await svc.identifyLogin('rider@gmail.com');
  assert.equal(id.method, 'otp');
  assert.equal((id as { bypass?: boolean }).bypass, true);
  const res = await svc.riderVerifyOtp('rider@gmail.com', '');
  assert.equal(res.user.email, 'rider@gmail.com');
});

test('OTP bypass still enforces the allowlist and one-email-one-account', async () => {
  const { svc, users } = setup({ AUTH_OTP_BYPASS: 'true' });
  await assert.rejects(() => svc.riderRequestOtp('a@playboot.com'), ForbiddenException);
  await users.create({ email: 'rider@gmail.com', role: 'rider' });
  await assert.rejects(() => svc.riderRequestOtp('rider@gmail.com'), (e: unknown) =>
    e instanceof ForbiddenException && JSON.stringify((e as HttpException).getResponse()).includes('auth.email_taken'));
});

test('bypass OFF: a missing code is still rejected', async () => {
  const { svc } = setup(); // default bypass=false
  await assert.rejects(() => svc.signupVerifyOtp('rider@gmail.com', '', 'N'), UnauthorizedException);
});

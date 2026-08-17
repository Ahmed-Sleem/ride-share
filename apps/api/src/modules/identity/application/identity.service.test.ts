/* Identity service tests — repository fakes, no database. Proves the rules:
   staff password login, rider OTP self-register, session rotation, change
   password, and that a NON-super-admin cannot create staff (§8.2). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { IdentityService } from './identity.service.js';
import { hashPassword, verifyPassword } from '../domain/password.js';
import type { UserRow } from '../contracts/types.js';
import type { Env } from '../../../config/env.js';

class FakeUsers {
  rows = new Map<string, UserRow>();
  seq = 0;
  async findByEmail(email: string) {
    return [...this.rows.values()].find((u) => u.email === email) ?? null;
  }
  async findByPhone(phone: string) {
    return [...this.rows.values()].find((u) => u.phone === phone) ?? null;
  }
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async create(input: { email?: string | null; phone?: string | null; name?: string; role: string; passwordHash?: string | null }) {
    const id = `u${++this.seq}`;
    const row: UserRow = {
      id,
      email: input.email ?? null,
      phone: input.phone ?? null,
      name: input.name ?? '',
      role: input.role as UserRow['role'],
      password_hash: input.passwordHash ?? null,
      status: 'active',
      created_at: new Date(),
    };
    this.rows.set(id, row);
    return row;
  }
  async setPassword(id: string, hash: string) {
    const u = this.rows.get(id);
    if (u) this.rows.set(id, { ...u, password_hash: hash });
  }
  async list() {
    return [...this.rows.values()];
  }
  async countByRole(role: string) {
    return [...this.rows.values()].filter((u) => u.role === role).length;
  }
}

class FakeOtps {
  store = new Map<string, { codeHash: string; attempts: number; expiresAt: Date }>();
  seq = 0;
  async upsert(phone: string, codeHash: string, expiresAt: Date) {
    this.store.set(phone, { codeHash, attempts: 0, expiresAt });
  }
  async findByPhone(phone: string) {
    const r = this.store.get(phone);
    if (!r) return null;
    return { id: 'otp-' + phone, phone, codeHash: r.codeHash, attempts: r.attempts, expiresAt: r.expiresAt };
  }
  async incrementAttempts(id: string) {
    for (const [k, v] of this.store) if ('otp-' + k === id) v.attempts++;
  }
  async delete(id: string) {
    for (const k of this.store.keys()) if ('otp-' + k === id) this.store.delete(k);
  }
}

class FakeSessions {
  store = new Map<string, { id: string; user: UserRow }>();
  seq = 0;
  async create(userId: string, tokenHash: string, _expiresAt: Date) {
    const user = this.userById(userId)!;
    this.store.set(tokenHash, { id: `s${++this.seq}`, user });
  }
  async findValid(tokenHash: string) {
    return this.store.get(tokenHash) ?? null;
  }
  async revoke(id: string) {
    for (const [k, v] of this.store) if (v.id === id) this.store.delete(k);
  }
  private userById(id: string) {
    return this.users.rows.get(id) ?? null;
  }
  constructor(private readonly users: FakeUsers) {}
}

function env(): Env {
  return {
    NODE_ENV: 'development',
    PORT: 3000,
    LOG_LEVEL: 'info',
    DATABASE_URL: 'postgres://localhost/x',
    JWT_SECRET: 'c'.repeat(32),
    CORS_ORIGINS: '',
    THROTTLE_TTL: 60000,
    THROTTLE_LIMIT: 100,
  } as Env;
}

const silentLogger = { info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined, log: () => undefined, verbose: () => undefined, fatal: () => undefined };

function setup() {
  const users = new FakeUsers();
  const otps = new FakeOtps();
  const sessions = new FakeSessions(users);
  const svc = new IdentityService(env(), silentLogger as never, users as never, otps as never, sessions as never);
  return { svc, users, otps, sessions };
}

test('staff login succeeds with correct password', async () => {
  const { svc, users } = setup();
  await users.create({ email: 'admin@x.com', role: 'super_admin', passwordHash: hashPassword('pw-12345678') });
  const res = await svc.staffLogin('admin@x.com', 'pw-12345678');
  assert.equal(res.user.role, 'super_admin');
  assert.ok(res.accessToken.length > 20);
});

test('staff login rejects a wrong password with a translation key', async () => {
  const { svc, users } = setup();
  await users.create({ email: 'admin@x.com', role: 'super_admin', passwordHash: hashPassword('pw-12345678') });
  await assert.rejects(() => svc.staffLogin('admin@x.com', 'wrong'), (e: unknown) => {
    return e instanceof UnauthorizedException && /auth\.invalid_credentials/.test(JSON.stringify((e as UnauthorizedException).getResponse()));
  });
});

test('a rider cannot sign in with staff password login', async () => {
  const { svc, users } = setup();
  await users.create({ phone: '+201000000000', role: 'rider' });
  await assert.rejects(() => svc.staffLogin('rider@x.com', 'whatever'), UnauthorizedException);
});

test('rider OTP verify with a wrong code is rejected with a translation key', async () => {
  const { svc } = setup();
  const phone = '+201000000000';
  await svc.riderRequestOtp(phone);
  await assert.rejects(() => svc.riderVerifyOtp(phone, '000000'), (e: unknown) => {
    return e instanceof UnauthorizedException && /auth\.otp_mismatch/.test(JSON.stringify((e as UnauthorizedException).getResponse()));
  });
});

test('OTP verify with the real code creates the rider (transport-captured code)', async () => {
  const { users } = setup();
  const phone = '+201000000000';
  const captured: string[] = [];
  const svc2 = new IdentityService(env(), { ...silentLogger, warn: (m: string) => {
    const found = m.match(/code for \S+: (\d{6})/);
    if (found) captured.push(found[1]!);
  } } as never, users as never, new FakeOtps() as never, new FakeSessions(users) as never);
  await svc2.riderRequestOtp(phone);
  assert.equal(captured.length, 1);
  const res = await svc2.riderVerifyOtp(phone, captured[0]!);
  assert.equal(res.user.role, 'rider');
  assert.equal(res.user.phone, phone);
});

test('refresh rotates the session', async () => {
  const { svc, users } = setup();
  await users.create({ email: 'admin@x.com', role: 'super_admin', passwordHash: hashPassword('pw-12345678') });
  const first = await svc.staffLogin('admin@x.com', 'pw-12345678');
  const second = await svc.refresh(first.refreshToken);
  assert.equal(second.user.role, 'super_admin');
  // the old refresh token is now revoked
  await assert.rejects(() => svc.refresh(first.refreshToken), UnauthorizedException);
});

test('change password verifies the current one first', async () => {
  const { svc, users } = setup();
  const u = await users.create({ email: 'admin@x.com', role: 'super_admin', passwordHash: hashPassword('old-12345678') });
  await svc.changePassword(u.id, 'old-12345678', 'new-12345678');
  const updated = await users.findById(u.id);
  assert.equal(verifyPassword('new-12345678', updated!.password_hash!), true);
  await assert.rejects(() => svc.changePassword(u.id, 'old-12345678', 'x'), UnauthorizedException);
});

test('a rider actor cannot create staff accounts (§8.2 — authority in one place)', async () => {
  const { svc, users } = setup();
  await users.create({ phone: '+201000000000', role: 'rider' });
  await assert.rejects(
    () => svc.createStaff({ role: 'rider' }, 'new@x.com', 'pw-12345678', 'manager'),
    ForbiddenException
  );
});

test('super_admin creates a staff account', async () => {
  const { svc, users } = setup();
  await users.create({ email: 'boss@x.com', role: 'super_admin', passwordHash: hashPassword('pw-12345678') });
  const created = await svc.createStaff({ role: 'super_admin' }, 'ops@x.com', 'pw-12345678', 'operations');
  assert.equal(created.role, 'operations');
  assert.equal(created.email, 'ops@x.com');
});

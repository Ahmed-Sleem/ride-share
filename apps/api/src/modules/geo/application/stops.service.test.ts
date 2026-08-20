/* Stops service tests — repository fake, no database. Proves the duplicate
   guard, coordinate bounds, authority, the public-verified-only rule and the
   two-person verification rule. Each has been observed failing (§0.2). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StopsService } from './stops.service.js';
import type { Env } from '../../../config/env.js';
import type { StopRow } from '../contracts/types.js';

class FakeStops {
  rows = new Map<string, StopRow>();
  verifications: unknown[] = [];
  seq = 0;
  async create(i: any) {
    const id = `s${++this.seq}`;
    const row: StopRow = {
      id, code: i.code, name_en: i.nameEn, name_ar: i.nameAr, lat: i.lat, lng: i.lng,
      status: 'draft', source: i.source, created_by: i.createdBy,
      stand_ok: null, lit_ok: null, legal_stop_ok: null, reachable_ok: null,
      walking_to_next_m: null, override_reason: i.overrideReason ?? null, created_at: new Date(),
    };
    this.rows.set(id, row);
    return row;
  }
  async findById(id: string) { return this.rows.get(id) ?? null; }
  async candidatesInBox() { return [...this.rows.values()]; }
  async verifiedInBox() { return [...this.rows.values()].filter((s) => s.status === 'verified'); }
  async listByStatus(ss: string[]) { return [...this.rows.values()].filter((s) => ss.includes(s.status)); }
  async setStatus(id: string, status: any) { const r = this.rows.get(id); if (r) this.rows.set(id, { ...r, status }); }
  async appendVerification(v: any) { this.verifications.push(v); return { ...v, id: `v${this.verifications.length}`, created_at: new Date() }; }
}
class FakeAudit { entries: unknown[] = []; async record(...a: unknown[]) { this.entries.push(a); } }

const env = () => ({
  NODE_ENV: 'development', PORT: 3000, LOG_LEVEL: 'info', DATABASE_URL: 'x',
  JWT_SECRET: 'c'.repeat(32), CORS_ORIGINS: '', THROTTLE_TTL: 60000, THROTTLE_LIMIT: 100,
  SMTP_PORT: 587, SMTP_SECURE: 'auto', AUTO_MIGRATE: 'true', EMAIL_ALLOWED_DOMAINS: '',
  AUTH_OTP_BYPASS: 'false', STOP_MIN_SPACING_M: 100, STOP_MAX_GAP_M: 1000,
}) as unknown as Env;

function setup() {
  const stops = new FakeStops();
  const audit = new FakeAudit();
  const svc = new StopsService(env(), stops as never, audit as never);
  return { svc, stops, audit };
}
const ops = { id: 'u1', role: 'operations' as const };
const ops2 = { id: 'u9', role: 'operations' as const };
const rider = { id: 'u3', role: 'rider' as const };

test('operations can create a stop; it persists the exact coordinate', async () => {
  const { svc } = setup();
  const s = await svc.createStop(ops, { nameEn: 'Gate 2', lat: 31.245678, lng: 29.983901, source: 'desk' });
  assert.equal(s.lat, 31.245678);
  assert.equal(s.lng, 29.983901);
  assert.equal(s.status, 'draft');
});

test('a rider cannot create a stop (§8.2 authority)', async () => {
  const { svc } = setup();
  await assert.rejects(() => svc.createStop(rider, { lat: 31.2, lng: 29.9, source: 'desk' }), ForbiddenException);
});

test('impossible coordinates are refused', async () => {
  const { svc } = setup();
  await assert.rejects(() => svc.createStop(ops, { lat: 91, lng: 0, source: 'desk' }), ConflictException);
});

test('a second stop within the minimum spacing is refused without a reason', async () => {
  const { svc } = setup();
  await svc.createStop(ops, { lat: 31.2, lng: 29.9, source: 'desk' });
  // ~55 m away — inside STOP_MIN_SPACING_M=100
  await assert.rejects(
    () => svc.createStop(ops, { lat: 31.2, lng: 29.9005, source: 'desk' }),
    (e: unknown) => e instanceof ConflictException && JSON.stringify((e as any).getResponse()).includes('geo.stop_too_close')
  );
});

test('an explicit override + reason lets a close stop through', async () => {
  const { svc } = setup();
  await svc.createStop(ops, { lat: 31.2, lng: 29.9, source: 'desk' });
  const s = await svc.createStop(ops, { lat: 31.2, lng: 29.9005, source: 'desk', overrideReason: 'opposite kerb of a dual carriageway' });
  assert.equal(s.override_reason, 'opposite kerb of a dual carriageway');
});

test('the public near query returns verified stops ONLY', async () => {
  const { svc, stops } = setup();
  const verified = await svc.createStop(ops, { lat: 31.2, lng: 29.9, source: 'desk' });
  await svc.createStop(ops, { lat: 31.21, lng: 29.91, source: 'desk' }); // stays draft
  await stops.setStatus(verified.id, 'verified');
  const near = await svc.verifiedNear(31.2, 29.9, 5000);
  assert.equal(near.length, 1, 'only the verified stop leaks');
  assert.equal(near[0]!.id, verified.id);
});

test('the two-person rule: the author cannot verify their own stop', async () => {
  const { svc } = setup();
  const s = await svc.createStop(ops, { lat: 31.2, lng: 29.9, source: 'desk' });
  await assert.rejects(
    () => svc.reviewStop(ops, s.id, 'approved'),
    (e: unknown) => e instanceof ForbiddenException && JSON.stringify((e as any).getResponse()).includes('geo.cannot_self_verify')
  );
});

test('a different administrator can verify it; rejection requires a reason', async () => {
  const { svc } = setup();
  const s = await svc.createStop(ops, { lat: 31.2, lng: 29.9, source: 'desk' });
  await assert.rejects(() => svc.reviewStop(ops2, s.id, 'rejected'), (e: unknown) =>
    e instanceof ForbiddenException && JSON.stringify((e as any).getResponse()).includes('geo.rejection_requires_reason'));
  await svc.reviewStop(ops2, s.id, 'approved');
  const listed = await svc.list(ops2, ['verified']);
  assert.ok(listed.some((x) => x.id === s.id), 'the stop is now verified');
});

test('reviewing a missing stop is a not-found', async () => {
  const { svc } = setup();
  await assert.rejects(() => svc.reviewStop(ops2, 'missing', 'approved'), NotFoundException);
});

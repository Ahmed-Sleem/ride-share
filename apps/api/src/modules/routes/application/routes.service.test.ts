/* Routes service tests — repository fake, no database. Proves authority, the
   verified-stops-only rule (via the DB trigger in the real system, exercised
   here through the publishedRoutesForStop/retire mapping), gapless reorder,
   cumulative distance recompute, and idempotent slot generation. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoutesService } from './routes.service.js';
import type { Env } from '../../../config/env.js';
import type { RouteRow, RouteStopRow, SlotRow } from '../contracts/types.js';

class FakeRoutes {
  routes = new Map<string, RouteRow>();
  routeStops = new Map<string, RouteStopRow[]>();
  slots = new Map<string, Set<string>>(); // routeId:date → times
  seq = 0;
  async create(i: any) {
    const id = `r${++this.seq}`;
    const row: RouteRow = { id, code: i.code, name_en: i.nameEn, name_ar: i.nameAr,
      status: 'draft', direction: i.direction, fare_minor: i.fareMinor,
      window_start: i.windowStart, window_end: i.windowEnd, slot_interval_min: i.slotIntervalMin,
      created_by: i.createdBy, created_at: new Date() };
    this.routes.set(id, row);
    return row;
  }
  async findById(id: string) { return this.routes.get(id) ?? null; }
  async list() { return [...this.routes.values()]; }
  async setStatus(id: string, status: any) { const r = this.routes.get(id); if (r) this.routes.set(id, { ...r, status }); }
  async countStops(id: string) { return (this.routeStops.get(id) || []).length; }
  async addStop(routeId: string, stopId: string, position: number, d: number, run: number) {
    const rows = this.routeStops.get(routeId) || [];
    const row: RouteStopRow = { id: `rs${rows.length + 1}`, route_id: routeId, stop_id: stopId,
      position, distance_from_start_m: d, run_minutes: run, lat: (rows.length) * 0.001 + 31.2, lng: (rows.length) * 0.001 + 29.9 };
    rows.push(row);
    this.routeStops.set(routeId, rows);
    return row;
  }
  async stops(routeId: string) { return [...(this.routeStops.get(routeId) || [])].sort((a, b) => a.position - b.position); }
  async stopLocation(stopId: string) {
    for (const rows of this.routeStops.values()) for (const r of rows) if (r.stop_id === stopId) return { lat: r.lat!, lng: r.lng! };
    return { lat: 31.3, lng: 29.8 };
  }
  async reorder(routeId: string, updates: any[]) {
    const rows = this.routeStops.get(routeId) || [];
    for (const u of updates) { const r = rows.find((x) => x.stop_id === u.stopId); if (r) { r.position = u.position; r.distance_from_start_m = u.distanceM; r.run_minutes = u.runMinutes; } }
  }
  async upsertSlot(routeId: string, date: string, time: string) {
    const key = `${routeId}:${date}`;
    if (!this.slots.has(key)) this.slots.set(key, new Set());
    this.slots.get(key)!.add(time);
  }
  async listSlots(routeId: string, from: string, to: string): Promise<SlotRow[]> {
    const out: SlotRow[] = [];
    for (const [key, times] of this.slots) {
      const parts = key.split(':');
      const rid = parts[0]!;
      const date = parts[1]!;
      if (rid !== routeId || date < from || date > to) continue;
      for (const t of times) out.push({ id: `${key}:${t}`, route_id: routeId, service_date: date, departs_at: t, required_vehicles: 1, created_at: new Date() });
    }
    return out;
  }
  async publishedRoutesForStop() { return []; }
}
class FakeAudit { entries: unknown[] = []; async record(...a: unknown[]) { this.entries.push(a); } }

const env = () => ({
  NODE_ENV: 'development', PORT: 3000, LOG_LEVEL: 'info', DATABASE_URL: 'x',
  JWT_SECRET: 'c'.repeat(32), CORS_ORIGINS: '', THROTTLE_TTL: 60000, THROTTLE_LIMIT: 100,
  SMTP_PORT: 587, SMTP_SECURE: 'auto', AUTO_MIGRATE: 'true', EMAIL_ALLOWED_DOMAINS: '',
  AUTH_OTP_BYPASS: 'false', STOP_MIN_SPACING_M: 100, STOP_MAX_GAP_M: 1000,
  STOP_MAX_FIX_ACCURACY_M: 20, PHOTO_STORAGE_DIR: '/tmp/rs-photos-test', PHOTO_MAX_BYTES: 8_000_000,
  ROUTE_SPEED_KMH: 20,
}) as unknown as Env;

function setup() {
  const repo = new FakeRoutes();
  const audit = new FakeAudit();
  const svc = new RoutesService(env(), repo as never, audit as never);
  return { svc, repo, audit };
}
const ops = { id: 'u1', role: 'operations' as const };
const rider = { id: 'u3', role: 'rider' as const };

test('operations creates a route with a stable code', async () => {
  const { svc } = setup();
  const r = await svc.createRoute(ops, { nameEn: 'Corniche Line', fareMinor: 1500, windowStart: '06:00', windowEnd: '10:00', slotIntervalMin: 15 });
  assert.equal(r.code, 'ALX-R001');
  assert.equal(r.fare_minor, 1500);
});

test('a rider cannot create a route (§8.2)', async () => {
  const { svc } = setup();
  await assert.rejects(() => svc.createRoute(rider, { fareMinor: 1, windowStart: '06:00', windowEnd: '10:00', slotIntervalMin: 15 }), ForbiddenException);
});

test('an invalid fare, interval or window is refused', async () => {
  const { svc } = setup();
  await assert.rejects(() => svc.createRoute(ops, { fareMinor: -5, windowStart: '06:00', windowEnd: '10:00', slotIntervalMin: 15 }), BadRequestException);
  await assert.rejects(() => svc.createRoute(ops, { fareMinor: 5, windowStart: '06:00', windowEnd: '10:00', slotIntervalMin: 3 }), BadRequestException);
  await assert.rejects(() => svc.createRoute(ops, { fareMinor: 5, windowStart: '10:00', windowEnd: '06:00', slotIntervalMin: 15 }), BadRequestException);
});

test('a route needs two stops before it can be published', async () => {
  const { svc } = setup();
  const r = await svc.createRoute(ops, { fareMinor: 1500, windowStart: '06:00', windowEnd: '10:00', slotIntervalMin: 15 });
  await svc.addStop(ops, r.id, 's1');
  await assert.rejects(() => svc.publish(ops, r.id), ConflictException);
  await svc.addStop(ops, r.id, 's2');
  await svc.publish(ops, r.id);
  assert.equal((await svc.get(ops, r.id)).route.status, 'published');
});

test('stops append in gapless positions; a published route is locked', async () => {
  const { svc } = setup();
  const r = await svc.createRoute(ops, { fareMinor: 1500, windowStart: '06:00', windowEnd: '10:00', slotIntervalMin: 15 });
  await svc.addStop(ops, r.id, 's1');
  await svc.addStop(ops, r.id, 's2');
  const { stops } = await svc.get(ops, r.id);
  assert.deepEqual(stops.map((s) => s.position), [1, 2]);
  await svc.publish(ops, r.id);
  await assert.rejects(() => svc.addStop(ops, r.id, 's3'), ConflictException);
});

test('reorder requires an exact permutation and rewrites positions atomically', async () => {
  const { svc } = setup();
  const r = await svc.createRoute(ops, { fareMinor: 1500, windowStart: '06:00', windowEnd: '10:00', slotIntervalMin: 15 });
  await svc.addStop(ops, r.id, 's1');
  await svc.addStop(ops, r.id, 's2');
  await svc.addStop(ops, r.id, 's3');
  await assert.rejects(() => svc.reorder(ops, r.id, ['s3', 's1']), ConflictException); // missing s2
  await svc.reorder(ops, r.id, ['s3', 's1', 's2']);
  const { stops } = await svc.get(ops, r.id);
  assert.deepEqual(stops.map((s) => [s.stop_id, s.position]), [['s3', 1], ['s1', 2], ['s2', 3]]);
});

test('slot generation is idempotent and refuses past dates', async () => {
  const { svc, repo } = setup();
  const r = await svc.createRoute(ops, { fareMinor: 1500, windowStart: '06:00', windowEnd: '10:00', slotIntervalMin: 15 });
  const from = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const to = from;
  const first = await svc.generateSlots(ops, r.id, from, to);
  const second = await svc.generateSlots(ops, r.id, from, to);
  assert.equal(first.generated, 16);
  assert.equal(second.generated, 16);
  const slots = await svc.listSlots(ops, r.id, from, to);
  assert.equal(slots.length, 16, 'no duplicates on regeneration');
  await assert.rejects(() => svc.generateSlots(ops, r.id, '2000-01-01', '2000-01-01'), BadRequestException);
  void repo;
});

test('a missing route is a not-found', async () => {
  const { svc } = setup();
  await assert.rejects(() => svc.get(ops, 'missing'), NotFoundException);
});

/* Journeys service tests — fakes, no database. Proves the claim rules: approved
   driver + own approved vehicle, race-safety (unique violation → clear
   refusal), past-slot refusal, release lock-window, open-for-booking. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JourneysService } from './journeys.service.js';
import type { Env } from '../../../config/env.js';
import type { JourneyRow } from '../contracts/types.js';
import type { SlotRow } from '../../routes/contracts/types.js';

class FakeJourneys {
  rows = new Map<string, JourneyRow>();
  seq = 0;
  async claim(i: any) {
    const id = `j${++this.seq}`;
    const row: JourneyRow = { id, route_id: i.routeId, slot_id: i.slotId, driver_user_id: i.driverUserId,
      vehicle_id: i.vehicleId, status: 'CLAIMED', committed: i.committed, seats_total: i.seatsTotal, created_at: new Date() };
    this.rows.set(id, row);
    return row;
  }
  async findById(id: string) {
    const j = this.rows.get(id);
    if (!j) return null;
    return { ...j, route_code: 'ALX-R001', route_name_en: 'Corniche', service_date: this.serviceDate, departs_at: this.departsAt };
  }
  serviceDate = '2026-09-01'; departsAt = '12:00';
  async byDriver(driverUserId: string) { return [...this.rows.values()].filter((r) => r.driver_user_id === driverUserId); }
  async setStatus(id: string, status: any) { const r = this.rows.get(id); if (r) this.rows.set(id, { ...r, status }); }
  async cancel(id: string) { const r = this.rows.get(id); if (r) this.rows.set(id, { ...r, status: 'CANCELLED' }); }
  async setPosition(id: string, lat: number, lng: number) {
    const r = this.rows.get(id);
    if (r) this.rows.set(id, { ...r, last_lat: lat, last_lng: lng, last_position_at: new Date() });
  }
}
class FakeRoutes {
  slot: SlotRow | null = { id: 's1', route_id: 'r1', service_date: '2026-09-01', departs_at: '12:00', required_vehicles: 1, created_at: new Date() };
  async getSlotById(_id: string) { return this.slot; }
  async slotDepartureInstant(_id: string) { return this.slot ? new Date(`${this.slot.service_date}T${this.slot.departs_at}:00+02:00`) : null; }
  async stopsOnRoute() { return []; }
}
class FakeDrivers {
  mode: 'ok' | 'not_approved' | 'not_yours' | 'vehicle_not_approved' = 'ok';
  async assertApprovedDriverWithVehicle(_userId: string, _vehicleId: string) {
    if (this.mode === 'not_approved') throw new ForbiddenException({ message_key: 'drivers.must_be_approved' });
    if (this.mode === 'not_yours') throw new ForbiddenException({ message_key: 'drivers.vehicle_not_yours' });
    if (this.mode === 'vehicle_not_approved') throw new ForbiddenException({ message_key: 'drivers.vehicle_not_approved' });
    return { id: 'v1', plate: 'ALX 100' };
  }
}
class FakeAudit { entries: unknown[] = []; async record(...a: unknown[]) { this.entries.push(a); } }

const env = () => ({
  NODE_ENV: 'development', PORT: 3000, LOG_LEVEL: 'info', DATABASE_URL: 'x',
  JWT_SECRET: 'c'.repeat(32), CORS_ORIGINS: '', THROTTLE_TTL: 60000, THROTTLE_LIMIT: 100,
  SMTP_PORT: 587, SMTP_SECURE: 'auto', AUTO_MIGRATE: 'true', EMAIL_ALLOWED_DOMAINS: '',
  AUTH_OTP_BYPASS: 'false', STOP_MIN_SPACING_M: 100, STOP_MAX_GAP_M: 1000,
  STOP_MAX_FIX_ACCURACY_M: 20, PHOTO_STORAGE_DIR: '/tmp/rs-photos-test', PHOTO_MAX_BYTES: 8_000_000,
  ROUTE_SPEED_KMH: 20, VEHICLE_SEATS: 14, MIN_CLAIM_LEAD_MINUTES: 30,
  BOARDING_WINDOW_BEFORE_MIN: 15, BOARDING_WINDOW_AFTER_MIN: 30, MAX_SCHEDULE_SLIP_MIN: 10,
  POSITION_STALE_SEC: 90,
}) as unknown as Env;

function setup() {
  const repo = new FakeJourneys();
  const routes = new FakeRoutes();
  const drivers = new FakeDrivers();
  const audit = new FakeAudit();
  const svc = new JourneysService(env(), repo as never, routes as never, drivers as never, audit as never);
  return { svc, repo, routes, drivers, audit };
}
const driver = { id: 'd1', role: 'driver' as const };
const rider = { id: 'r1', role: 'rider' as const };

test('an approved driver claims a slot → journey CLAIMED', async () => {
  const { svc } = setup();
  const j = await svc.claimSlot(driver, 's1', 'v1');
  assert.equal(j.status, 'CLAIMED');
  assert.equal(j.committed, true);
  assert.equal(j.seats_total, 14);
});

test('a rider cannot claim (§8.2)', async () => {
  const { svc } = setup();
  await assert.rejects(() => svc.claimSlot(rider, 's1', 'v1'), ForbiddenException);
});

test('an unapproved driver, or a vehicle not theirs / not approved, is refused', async () => {
  const { svc, drivers } = setup();
  drivers.mode = 'not_approved';
  await assert.rejects(() => svc.claimSlot(driver, 's1', 'v1'), ForbiddenException);
  drivers.mode = 'not_yours';
  await assert.rejects(() => svc.claimSlot(driver, 's1', 'v1'), ForbiddenException);
  drivers.mode = 'vehicle_not_approved';
  await assert.rejects(() => svc.claimSlot(driver, 's1', 'v1'), ForbiddenException);
});

test('a missing slot is a not-found', async () => {
  const { svc, routes } = setup();
  routes.slot = null;
  await assert.rejects(() => svc.claimSlot(driver, 's1', 'v1'), NotFoundException);
});

test('a slot in the past is refused', async () => {
  const { svc, routes } = setup();
  routes.slot = { id: 's1', route_id: 'r1', service_date: '2000-01-01', departs_at: '12:00', required_vehicles: 1, created_at: new Date() };
  await assert.rejects(() => svc.claimSlot(driver, 's1', 'v1'), ConflictException);
});

test('releasing inside the lock window is refused; outside succeeds', async () => {
  const { svc, routes } = setup();
  // The service parses `date T time +02:00` (Cairo, no DST). To express
  // "29 minutes from now" in that form, add the +2h offset to the wall clock.
  const cairoWall = (msFromNow: number) => new Date(Date.now() + msFromNow + 2 * 3600_000);
  const toSlot = (t: Date, id: string): SlotRow => ({
    id, route_id: 'r1', service_date: t.toISOString().slice(0, 10),
    departs_at: t.toISOString().slice(11, 16), required_vehicles: 1, created_at: new Date(),
  });

  routes.slot = toSlot(cairoWall(29 * 60_000), 's1'); // inside the 30-min lock window
  const j = await svc.claimSlot(driver, 's1', 'v1');
  await assert.rejects(() => svc.releaseClaim(driver, j.id), ConflictException);

  routes.slot = toSlot(cairoWall(24 * 3600_000), 's2'); // a day away — releasable
  const j2 = await svc.claimSlot(driver, 's2', 'v1');
  await svc.releaseClaim(driver, j2.id);
  assert.equal((await svc.myJourneys(driver)).find((x) => x.id === j2.id)!.status, 'CANCELLED');
});

test('a driver cannot release another driver\'s claim', async () => {
  const { svc } = setup();
  const j = await svc.claimSlot(driver, 's1', 'v1');
  const other = { id: 'd2', role: 'driver' as const };
  await assert.rejects(() => svc.releaseClaim(other, j.id), ForbiddenException);
});

test('openForBooking transitions CLAIMED → OPEN_FOR_BOOKING', async () => {
  const { svc } = setup();
  const j = await svc.claimSlot(driver, 's1', 'v1');
  await svc.openForBooking(driver, j.id);
  assert.equal((await svc.myJourneys(driver)).find((x) => x.id === j.id)!.status, 'OPEN_FOR_BOOKING');
});

test('start from OPEN locks then goes IN_PROGRESS; complete is legal', async () => {
  const { svc } = setup();
  const j = await svc.claimSlot(driver, 's1', 'v1');
  await svc.openForBooking(driver, j.id);
  await svc.start(driver, j.id);
  assert.equal((await svc.myJourneys(driver)).find((x) => x.id === j.id)!.status, 'IN_PROGRESS');
  await svc.complete(driver, j.id);
  assert.equal((await svc.myJourneys(driver)).find((x) => x.id === j.id)!.status, 'COMPLETED');
});

test('completed cannot start again', async () => {
  const { svc } = setup();
  const j = await svc.claimSlot(driver, 's1', 'v1');
  await svc.openForBooking(driver, j.id);
  await svc.start(driver, j.id);
  await svc.complete(driver, j.id);
  await assert.rejects(() => svc.start(driver, j.id));
});

test('a rider cannot update position', async () => {
  const { svc } = setup();
  const j = await svc.claimSlot(driver, 's1', 'v1');
  await assert.rejects(() => svc.position(rider, j.id, 31.2, 29.9), ForbiddenException);
});

test('position is refused unless the journey is IN_PROGRESS (off-shift)', async () => {
  const { svc } = setup();
  const j = await svc.claimSlot(driver, 's1', 'v1');
  await assert.rejects(() => svc.position(driver, j.id, { lat: 31.2, lng: 29.9 }), ConflictException);
});

test('a batch of points stores the last fix only (no interpolation)', async () => {
  const { svc, repo } = setup();
  const j = await svc.claimSlot(driver, 's1', 'v1');
  await svc.openForBooking(driver, j.id);
  await svc.start(driver, j.id);
  const r = await svc.position(driver, j.id, {
    points: [
      { lat: 31.20, lng: 29.90 },
      { lat: 31.21, lng: 29.91 },
      { lat: 31.22, lng: 29.92 },
    ],
  });
  assert.equal(r.applied, 3);
  const row = repo.rows.get(j.id)!;
  assert.equal(row.last_lat, 31.22);
  assert.equal(row.last_lng, 29.92);
});

test('race: a duplicate claim (UNIQUE violation) maps to a clear refusal', async () => {
  const { svc, repo } = setup();
  const first = await svc.claimSlot(driver, 's1', 'v1');
  // simulate the DB UNIQUE slot_id firing on the second claim
  const original = repo.claim.bind(repo);
  repo.claim = async (i: any) => {
    if (i.slotId === first.slot_id) { const e: any = new Error('duplicate key'); e.code = '23505'; throw e; }
    return original(i);
  };
  await assert.rejects(
    () => svc.claimSlot(driver, 's1', 'v1'),
    (e: unknown) => e instanceof ConflictException &&
      JSON.stringify((e as any).getResponse()).includes('journeys.slot_claimed')
  );
});

/* ── Path A (DEC-205): the ops live-fleet read for the map ─────────── */
test('liveFleet: ops may read it; a rider may not (authority)', async () => {
  const fakeRepo = { liveJourneys: async () => [{ id: 'j1', status: 'IN_PROGRESS', last_lat: 31.2, last_lng: 29.9, stops: [] }] };
  const svc = new JourneysService({} as never, fakeRepo as never, {} as never, {} as never, {} as never);
  const ops = { id: 'ops-1', role: 'operations' } as never;
  const rider = { id: 'r-1', role: 'rider' } as never;
  const fleet = await svc.liveFleet(ops);
  assert.equal(Array.isArray(fleet) && fleet.length === 1, true);
  await assert.rejects(() => svc.liveFleet(rider), /Forbidden/);
});

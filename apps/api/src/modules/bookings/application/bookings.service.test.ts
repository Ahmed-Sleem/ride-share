/* Bookings service tests — fakes, no database. Proves: fare locked at booking,
   boarding stop must be on the route, seats capped (friendly + trigger-mapped),
   seat guard maps to a clear refusal, cancellation frees seats (guard counts
   non-cancelled only), authority. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import type { BookingRow } from '../contracts/types.js';
import type { JourneyRow } from '../../journeys/contracts/types.js';

class FakeBookings {
  rows = new Map<string, BookingRow>();
  seq = 0;
  async create(i: any) {
    const id = `b${++this.seq}`;
    const row: BookingRow = { id, journey_id: i.journeyId, rider_user_id: i.riderUserId,
      boarding_stop_id: i.boardingStopId, seats: i.seats, fare_minor: i.fareMinor,
      code: i.code, status: 'RESERVED', created_at: new Date() };
    this.rows.set(id, row);
    return row;
  }
  async findById(id: string) { return this.rows.get(id) ?? null; }
  async byRider(uid: string) { return [...this.rows.values()].filter((b) => b.rider_user_id === uid); }
  async countBookedSeats(jid: string) { return [...this.rows.values()].filter((b) => b.journey_id === jid && b.status !== 'CANCELLED').reduce((a, b) => a + b.seats, 0); }
  async setStatus(id: string, status: any) { const r = this.rows.get(id); if (r) this.rows.set(id, { ...r, status }); }
}
class FakeJourneys {
  seats = 14;
  failBookable = false;
  departed = false;
  async getForBooking(_id: string): Promise<JourneyRow> {
    if (this.failBookable) { const e: any = new Error('conflict'); e.messageKey = 'journeys.not_bookable'; throw e; }
    if (this.departed) throw new ConflictException({ message_key: 'journeys.departed' });
    return { id: 'j1', route_id: 'r1', slot_id: 's1', driver_user_id: 'd1', vehicle_id: 'v1',
      status: 'OPEN_FOR_BOOKING', committed: true, seats_total: this.seats, created_at: new Date() };
  }
}
class FakeRoutes {
  fare = 1500;
  onRoute = true;
  async hasStop() { return this.onRoute; }
  async getRouteFare() { return this.fare; }
}
class FakeAudit { entries: unknown[] = []; async record(...a: unknown[]) { this.entries.push(a); } }

function setup() {
  const repo = new FakeBookings();
  const journeys = new FakeJourneys();
  const routes = new FakeRoutes();
  const audit = new FakeAudit();
  const svc = new BookingsService(repo as never, journeys as never, routes as never, audit as never);
  return { svc, repo, journeys, routes, audit };
}
const rider = { id: 'r1', role: 'rider' as const };
const driver = { id: 'd1', role: 'driver' as const };
const ops = { id: 'o1', role: 'operations' as const };

test('a rider books a seat; the fare is locked at route fare × seats', async () => {
  const { svc } = setup();
  const b = await svc.book(rider, { journeyId: 'j1', boardingStopId: 's1', seats: 2 });
  assert.equal(b.fare_minor, 3000);
  assert.equal(b.seats, 2);
  assert.match(b.code, /^[0-9]{6}$/);
});

test('a role without BOOK_RIDE cannot book (§8.2 — a driver may ride, staff may not)', async () => {
  const { svc } = setup();
  await assert.rejects(() => svc.book(ops, { journeyId: 'j1', boardingStopId: 's1', seats: 1 }), ForbiddenException);
  // a driver IS allowed to ride (CH02 2.4)
  const b = await svc.book(driver, { journeyId: 'j1', boardingStopId: 's1', seats: 1 });
  assert.equal(b.status, 'RESERVED');
});

test('boarding off-route is refused', async () => {
  const { svc, routes } = setup();
  routes.onRoute = false;
  await assert.rejects(() => svc.book(rider, { journeyId: 'j1', boardingStopId: 'off', seats: 1 }), ConflictException);
});

test('an invalid seat count is refused', async () => {
  const { svc } = setup();
  await assert.rejects(() => svc.book(rider, { journeyId: 'j1', boardingStopId: 's1', seats: 0 }), ConflictException);
  await assert.rejects(() => svc.book(rider, { journeyId: 'j1', boardingStopId: 's1', seats: 9 }), ConflictException);
});

test('booking more seats than remain is refused (friendly pre-check)', async () => {
  const { svc, repo } = setup();
  await svc.book(rider, { journeyId: 'j1', boardingStopId: 's1', seats: 4 });
  await svc.book(rider, { journeyId: 'j1', boardingStopId: 's1', seats: 4 });
  await svc.book(rider, { journeyId: 'j1', boardingStopId: 's1', seats: 4 }); // 12 booked
  await assert.rejects(() => svc.book(rider, { journeyId: 'j1', boardingStopId: 's1', seats: 4 }), ConflictException);
  void repo;
});

test('the DB seat-guard violation maps to a clear refusal', async () => {
  const { svc, repo } = setup();
  repo.create = async () => {
    const e: any = new Error('journey has no seats left');
    e.code = '23514';
    throw e;
  };
  await assert.rejects(
    () => svc.book(rider, { journeyId: 'j1', boardingStopId: 's1', seats: 1 }),
    (e: unknown) => e instanceof ConflictException &&
      JSON.stringify((e as any).getResponse()).includes('bookings.no_seats')
  );
});

test('a non-bookable or departed journey is refused', async () => {
  const { svc, journeys } = setup();
  journeys.failBookable = true;
  await assert.rejects(() => svc.book(rider, { journeyId: 'j1', boardingStopId: 's1', seats: 1 }));
  journeys.failBookable = false; journeys.departed = true;
  await assert.rejects(() => svc.book(rider, { journeyId: 'j1', boardingStopId: 's1', seats: 1 }), ConflictException);
});

test('cancelling returns the seats (guard counts non-cancelled only)', async () => {
  const { svc, repo } = setup();
  const b = await svc.book(rider, { journeyId: 'j1', boardingStopId: 's1', seats: 4 });
  await svc.cancel(rider, b.id);
  assert.equal(await repo.countBookedSeats('j1'), 0, 'seats returned');
});

test('a rider cannot cancel someone else\'s booking', async () => {
  const { svc } = setup();
  const b = await svc.book(rider, { journeyId: 'j1', boardingStopId: 's1', seats: 1 });
  await assert.rejects(() => svc.cancel({ id: 'r2', role: 'rider' as const }, b.id), ForbiddenException);
});

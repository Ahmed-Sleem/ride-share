/* Bookings service — application layer (P3.6). The fare is LOCKED at creation
   (DEC-056); seat inventory is enforced by the DB trigger, with a friendly
   pre-check for a clean error; a cancelled booking frees its seats because the
   guard only counts non-cancelled rows. */
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingsRepository } from '../infra/bookings.repository.js';
import { JourneysService } from '../../journeys/contracts/public.js';
import { RoutesService } from '../../routes/contracts/public.js';
import { AuditService } from '../../audit/contracts/public.js';
import { assertCan, Capability, Role } from '../../../security/authority/authority.resolver.js';
import { newBookingCode } from '../domain/booking.js';
import type { Actor } from '../../identity/contracts/types.js';
import type { BookingRow } from '../contracts/types.js';

@Injectable()
export class BookingsService {
  constructor(
    private readonly bookings: BookingsRepository,
    private readonly journeys: JourneysService,
    private readonly routes: RoutesService,
    private readonly audit: AuditService
  ) {}

  /** Book seats on a journey (P3.6). Boarding is at one stop on the route;
      the fare is the route's flat fare × seats, LOCKED here. */
  async book(actor: Actor, input: {
    journeyId: string; boardingStopId: string; seats: number;
  }): Promise<BookingRow> {
    assertCan(actor.role as unknown as Role, Capability.BOOK_RIDE);
    const seats = Math.floor(input.seats);
    if (!Number.isInteger(seats) || seats < 1 || seats > 4) {
      throw new ConflictException({ message_key: 'bookings.bad_seats' });
    }
    const journey = await this.journeys.getForBooking(input.journeyId);
    const routeId = journey.route_id;
    const onRoute = await this.routes.hasStop(routeId, input.boardingStopId);
    if (!onRoute) {
      throw new ConflictException({ message_key: 'bookings.stop_not_on_route' });
    }
    // friendly pre-check (the DB trigger is authoritative)
    const booked = await this.bookings.countBookedSeats(input.journeyId);
    if (booked + seats > journey.seats_total) {
      throw new ConflictException({ message_key: 'bookings.no_seats' });
    }
    const fareMinor = (await this.routes.getRouteFare(routeId)) * seats;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const created = await this.bookings.create({
          journeyId: input.journeyId, riderUserId: actor.id,
          boardingStopId: input.boardingStopId, seats, fareMinor,
          code: newBookingCode(),
        });
        await this.audit.record(actor, 'booking.create', {
          targetType: 'booking', targetId: created.id,
          after: { journeyId: input.journeyId, seats, fareMinor },
        });
        return created;
      } catch (e) {
        if (isSeatGuardViolation(e)) {
          throw new ConflictException({ message_key: 'bookings.no_seats' });
        }
        if (isUniqueViolation(e)) continue;   // code collision → retry
        throw e;
      }
    }
    throw new ConflictException({ message_key: 'bookings.no_seats' });
  }

  async myBookings(actor: Actor): Promise<BookingRow[]> {
    assertCan(actor.role as unknown as Role, Capability.BOOK_RIDE);
    return this.bookings.byRider(actor.id);
  }

  /** Cancel a booking before departure — the seats return to inventory. */
  async cancel(actor: Actor, bookingId: string): Promise<{ ok: true }> {
    assertCan(actor.role as unknown as Role, Capability.BOOK_RIDE);
    const booking = await this.bookings.findById(bookingId);
    if (!booking) throw new NotFoundException({ message_key: 'bookings.not_found' });
    if (booking.rider_user_id !== actor.id) {
      throw new ForbiddenException({ message_key: 'bookings.not_yours' });
    }
    if (booking.status !== 'RESERVED' && booking.status !== 'CONFIRMED') {
      throw new ConflictException({ message_key: 'bookings.cannot_cancel', details: { status: booking.status } });
    }
    await this.bookings.setStatus(bookingId, 'CANCELLED');
    await this.audit.record(actor, 'booking.cancel', { targetType: 'booking', targetId: bookingId });
    return { ok: true };
  }
}

function isSeatGuardViolation(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  return err?.code === '23514' && /no seats left/.test(err?.message ?? '');
}
function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
}

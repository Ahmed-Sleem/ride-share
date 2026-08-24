/* Bookings service — application layer (P3.6). The fare is LOCKED at creation
   (DEC-056); seat inventory is enforced by the DB trigger, with a friendly
   pre-check for a clean error; a cancelled booking frees its seats because the
   guard only counts non-cancelled rows. */
import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { BookingsRepository } from '../infra/bookings.repository.js';
import { JourneysService } from '../../journeys/contracts/public.js';
import { RoutesService } from '../../routes/contracts/public.js';
import { AuditService } from '../../audit/contracts/public.js';
import { NotificationsService } from '../../notifications/contracts/public.js';
import { assertCan, Capability, Role } from '../../../security/authority/authority.resolver.js';
import { CONFIG, type Env } from '../../../config/env.js';
import { newBookingCode } from '../domain/booking.js';
import { isBoardingOpen, scanOutcome } from '../domain/boarding.js';
import type { Actor } from '../../identity/contracts/types.js';
import type { BookingRow } from '../contracts/types.js';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(CONFIG) private readonly env: Env,
    private readonly bookings: BookingsRepository,
    @Inject(forwardRef(() => JourneysService)) private readonly journeys: JourneysService,
    private readonly routes: RoutesService,
    private readonly audit: AuditService,
    private readonly notes: NotificationsService,
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

  async scan(actor: Actor, input: { journeyId: string; code: string }): Promise<BookingRow> {
    assertCan(actor.role as unknown as Role, Capability.SCAN_BOARDING);
    const code = String(input.code || '').replace(/\D/g, '').padStart(6, '0').slice(-6);
    const journey = await this.journeys.getById(input.journeyId);
    if (!journey) throw new NotFoundException({ message_key: 'journeys.not_found' });
    if (journey.driver_user_id !== actor.id) {
      await this.audit.record(actor, 'booking.scan_refused', {
        targetType: 'journey', targetId: input.journeyId, after: { reason: 'not_yours' },
      });
      throw new ForbiddenException({ message_key: 'journeys.not_yours' });
    }
    const booking = await this.bookings.findByCode(code);
    if (!booking) {
      await this.audit.record(actor, 'booking.scan_refused', {
        targetType: 'journey', targetId: input.journeyId, after: { reason: 'not_found', code },
      });
      throw new NotFoundException({ message_key: 'bookings.not_found' });
    }
    if (booking.journey_id !== input.journeyId) {
      await this.audit.record(actor, 'booking.scan_refused', {
        targetType: 'booking', targetId: booking.id, after: { reason: 'wrong_journey' },
      });
      throw new ConflictException({ message_key: 'bookings.wrong_journey' });
    }
    const outcome = scanOutcome(booking.status);
    if (outcome === 'already_boarded') {
      await this.audit.record(actor, 'booking.scan_refused', {
        targetType: 'booking', targetId: booking.id, after: { reason: 'already_boarded' },
      });
      throw new ConflictException({ message_key: 'bookings.already_boarded' });
    }
    if (outcome === 'cannot_board') {
      await this.audit.record(actor, 'booking.scan_refused', {
        targetType: 'booking', targetId: booking.id, after: { reason: 'cannot_board', status: booking.status },
      });
      throw new ConflictException({ message_key: 'bookings.cannot_board' });
    }
    const departs = await this.routes.slotDepartureInstant(journey.slot_id);
    if (!departs || !isBoardingOpen(departs, new Date(), this.env.BOARDING_WINDOW_BEFORE_MIN, this.env.BOARDING_WINDOW_AFTER_MIN)) {
      await this.audit.record(actor, 'booking.scan_refused', {
        targetType: 'booking', targetId: booking.id, after: { reason: 'out_of_window' },
      });
      throw new ConflictException({ message_key: 'bookings.out_of_window' });
    }
    await this.bookings.setStatus(booking.id, 'ON_BOARD');
    await this.audit.record(actor, 'booking.scan', { targetType: 'booking', targetId: booking.id });
    return { ...booking, status: 'ON_BOARD' };
  }

  async manifest(actor: Actor, journeyId: string) {
    assertCan(actor.role as unknown as Role, Capability.SCAN_BOARDING);
    const journey = await this.journeys.getById(journeyId);
    if (!journey) throw new NotFoundException({ message_key: 'journeys.not_found' });
    if (journey.driver_user_id !== actor.id) {
      throw new ForbiddenException({ message_key: 'journeys.not_yours' });
    }
    return this.bookings.manifest(journeyId);
  }

  async requestAlight(actor: Actor, bookingId: string): Promise<{ ok: true }> {
    assertCan(actor.role as unknown as Role, Capability.BOOK_RIDE);
    const booking = await this.bookings.findById(bookingId);
    if (!booking) throw new NotFoundException({ message_key: 'bookings.not_found' });
    if (booking.rider_user_id !== actor.id) {
      throw new ForbiddenException({ message_key: 'bookings.not_yours' });
    }
    if (booking.status !== 'ON_BOARD') {
      throw new ConflictException({ message_key: 'bookings.cannot_alight' });
    }
    await this.bookings.requestAlight(bookingId);
    await this.audit.record(actor, 'booking.alight', { targetType: 'booking', targetId: bookingId });
    return { ok: true };
  }

  async completeBoardedOn(journeyId: string): Promise<void> {
    await this.bookings.completeOnBoard(journeyId);
  }

  async finishJourney(actor: Actor, journeyId: string): Promise<{ ok: true }> {
    await this.journeys.complete(actor, journeyId);
    await this.bookings.completeOnBoard(journeyId);
    return { ok: true };
  }

  async abortJourney(actor: Actor, journeyId: string, reason: string): Promise<{ ok: true }> {
    await this.journeys.abort(actor, journeyId, reason);
    const riders = await this.bookings.riderIdsOnJourney(journeyId);
    for (const uid of riders) {
      await this.notes.notify({
        userId: uid, kind: 'journey_aborted',
        titleEn: 'Your ride was cancelled', titleAr: 'أُلغيت رحلتك',
        bodyEn: reason || 'The driver could not complete this departure.',
        bodyAr: reason || 'تعذّر على السائق إكمال هذا الموعد.',
        refType: 'journey', refId: journeyId,
      });
    }
    return { ok: true };
  }

  async riderIdsOn(journeyId: string): Promise<string[]> {
    return this.bookings.riderIdsOnJourney(journeyId);
  }

  async liveForRider(actor: Actor, bookingId: string) {
    assertCan(actor.role as unknown as Role, Capability.BOOK_RIDE);
    const booking = await this.bookings.findById(bookingId);
    if (!booking) throw new NotFoundException({ message_key: 'bookings.not_found' });
    if (booking.rider_user_id !== actor.id) {
      throw new ForbiddenException({ message_key: 'bookings.not_yours' });
    }
    return this.journeys.progressForRider(booking);
  }

  async getBookingForPayment(bookingId: string) {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) return null;
    const journey = await this.journeys.getById(booking.journey_id);
    if (!journey) return null;
    return {
      id: booking.id,
      riderUserId: booking.rider_user_id,
      driverUserId: journey.driver_user_id,
      journeyId: booking.journey_id,
      fareMinor: booking.fare_minor,
      status: booking.status,
      paymentMethod: null as 'wallet' | 'cash' | null,
    };
  }
}

function isSeatGuardViolation(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  return err?.code === '23514' && /no seats left/.test(err?.message ?? '');
}
function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
}

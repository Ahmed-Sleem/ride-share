/* ══════════════════════════════════════════════════════════════════════
   Booking domain rules (P3.6). Pure and tested. The boarding code is a
   6-digit number (the always-visible fallback, DEC-049/136); the seat guard
   lives in the DATABASE (bookings_seat_guard), not here, so parallel bookings
   can never oversell. Cancelling returns the seats because the guard only
   counts non-cancelled bookings.                             */
import { randomInt } from 'node:crypto';

export const BOOKING_STATUS = [
  'RESERVED', 'CONFIRMED', 'ON_BOARD', 'COMPLETED', 'CANCELLED', 'NO_SHOW',
] as const;
export type BookingStatus = (typeof BOOKING_STATUS)[number];

export const MAX_SEATS_PER_BOOKING = 4;

/** A fresh 6-digit boarding code (uniqueness is enforced by the DB UNIQUE). */
export function newBookingCode(): string {
  return String(randomInt(0, 1000000)).padStart(6, '0');
}

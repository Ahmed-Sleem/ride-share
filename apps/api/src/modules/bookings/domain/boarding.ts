/* Pure boarding rules (P3.8). Window and scan-state live here so they can
   be unit-tested without Nest or a database. Codes stay in booking.ts. */
import type { BookingStatus } from './booking.js';

export const DEFAULT_BOARDING_BEFORE_MIN = 15;
export const DEFAULT_BOARDING_AFTER_MIN = 30;

export function isBoardingOpen(
  departsAt: Date,
  now: Date,
  beforeMin = DEFAULT_BOARDING_BEFORE_MIN,
  afterMin = DEFAULT_BOARDING_AFTER_MIN,
): boolean {
  const t = departsAt.getTime();
  const n = now.getTime();
  return n >= t - beforeMin * 60_000 && n <= t + afterMin * 60_000;
}

/** RESERVED/CONFIRMED may board. ON_BOARD is already used. Anything else is refused. */
export function scanOutcome(status: BookingStatus): 'ok' | 'already_boarded' | 'cannot_board' {
  if (status === 'ON_BOARD') return 'already_boarded';
  if (status === 'RESERVED' || status === 'CONFIRMED') return 'ok';
  return 'cannot_board';
}

/* ══════════════════════════════════════════════════════════════════════
   Journey state machine (CH03 §3.3) — pure and tested. Every legal transition
   is enumerated; anything else is rejected. A claim creates CLAIMED; the
   driver opens it for booking before the departure (or it stays CLAIMED and
   locks automatically); from LOCKED it departs (IN_PROGRESS) and completes.
   CANCELLED = never departed; ABORTED = departed but could not finish.
   ══════════════════════════════════════════════════════════════════════ */

export const JOURNEY_STATUS = [
  'CLAIMED', 'OPEN_FOR_BOOKING', 'LOCKED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ABORTED',
] as const;
export type JourneyStatus = (typeof JOURNEY_STATUS)[number];

export const JOURNEY_TRANSITIONS: Record<JourneyStatus, readonly JourneyStatus[]> = {
  CLAIMED: ['OPEN_FOR_BOOKING', 'CANCELLED'],
  OPEN_FOR_BOOKING: ['LOCKED', 'CANCELLED'],
  LOCKED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'ABORTED'],
  COMPLETED: [],
  CANCELLED: [],
  ABORTED: [],
};

export function canTransition(from: JourneyStatus, to: JourneyStatus): boolean {
  return JOURNEY_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertJourneyTransition(from: JourneyStatus, to: JourneyStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`illegal journey transition: ${from} -> ${to}`);
  }
}

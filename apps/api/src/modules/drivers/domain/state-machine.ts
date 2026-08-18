/* ══════════════════════════════════════════════════════════════════════
   Approval state machines (DEC-035, CH02 §2.3.2). Pure domain logic — every
   legal transition is enumerated; everything else is rejected. The
   verification rules (a rejected driver may re-apply, an approved driver
   cannot be re-approved) live here, not in the HTTP layer.
   ══════════════════════════════════════════════════════════════════════ */

export const DRIVER_STATUS = ['draft', 'submitted', 'under_review', 'approved', 'rejected'] as const;
export type DriverStatus = (typeof DRIVER_STATUS)[number];

export const VEHICLE_STATUS = [
  'draft', 'submitted', 'under_review', 'approved', 'rejected', 'suspended', 'retired',
] as const;
export type VehicleStatus = (typeof VEHICLE_STATUS)[number];

export const DRIVER_TRANSITIONS: Record<DriverStatus, readonly DriverStatus[]> = {
  draft: ['submitted'],
  submitted: ['under_review', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: [],           // terminal (suspension/removal is a CH12 concern, later)
  rejected: ['submitted'], // re-apply
};

export const VEHICLE_TRANSITIONS: Record<VehicleStatus, readonly VehicleStatus[]> = {
  draft: ['submitted'],
  submitted: ['under_review', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['suspended', 'retired'],
  rejected: ['submitted'],
  suspended: ['approved', 'retired'],
  retired: [],
};

export function canTransition<T extends string>(
  transitions: Record<T, readonly T[]>,
  from: T,
  to: T
): boolean {
  return transitions[from]?.includes(to) ?? false;
}

export function assertTransition<T extends string>(
  transitions: Record<T, readonly T[]>,
  from: T,
  to: T,
  what: string
): void {
  if (!canTransition(transitions, from, to)) {
    throw new Error(`illegal ${what} transition: ${from} -> ${to}`);
  }
}

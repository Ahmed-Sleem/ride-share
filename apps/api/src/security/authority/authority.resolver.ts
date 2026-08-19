/* ══════════════════════════════════════════════════════════════════════
   The ONE authority resolver (§8.2, P0.6). The only place in the system
   that answers "may this actor do this". A second, well-meaning copy is a
   defect even while its answer agrees — the two will be edited on different
   days by people solving different problems.

   The matrix is the seed from CH2 §2.4; M1 fills in the complete
   permission table and the guard becomes the only gate on every route.
   Unknown capabilities are denied by default.
   ══════════════════════════════════════════════════════════════════════ */
import { ForbiddenException } from '@nestjs/common';

export enum Role {
  RIDER = 'rider',
  DRIVER = 'driver',
  OPERATIONS = 'operations',
  MANAGER = 'manager',
  SUPPORT = 'support',
  SUPER_ADMIN = 'super_admin',
}

export enum Capability {
  // rider
  BOOK_RIDE = 'book.ride',
  MANAGE_OWN_ACCOUNT = 'account.self',
  APPLY_AS_DRIVER = 'driver.apply',
  // driver (a driver may also ride — CH02 2.4 "Create a Ride Request: Driver Y (as a rider)")
  RUN_DUTY = 'duty.run',
  CLAIM_SLOT = 'slot.claim',
  SCAN_BOARDING = 'boarding.scan',
  VIEW_OWN_EARNINGS = 'earnings.self',
  // operations
  VIEW_QUEUE = 'queue.view',
  VIEW_LIVEMAP = 'livemap.view',
  APPROVE_DRIVER = 'drivers.approve',
  MANAGE_VEHICLES = 'vehicles.manage',
  MANAGE_STOPS = 'stops.manage',
  MANAGE_ROUTES = 'routes.manage',
  // manager
  EDIT_PRICING = 'pricing.edit',
  MANAGE_PROMOTIONS = 'promos.manage',
  VIEW_ANALYTICS = 'analytics.view',
  // support
  SUPPORT_LOOKUP = 'support.lookup',
  SUPPORT_REFUND = 'support.refund',
  SUPPORT_TICKETS = 'support.tickets',
  // super admin / cross-cutting
  MANAGE_STAFF = 'staff.manage',
  MANAGE_CONFIG = 'config.manage',
  VIEW_AUDIT = 'audit.view',
}

const MATRIX: Record<Role, ReadonlySet<Capability>> = {
  [Role.RIDER]: new Set([Capability.BOOK_RIDE, Capability.MANAGE_OWN_ACCOUNT, Capability.APPLY_AS_DRIVER]),
  [Role.DRIVER]: new Set([
    Capability.BOOK_RIDE, // a driver may ride (CH02 2.4)
    Capability.MANAGE_OWN_ACCOUNT,
    Capability.APPLY_AS_DRIVER,
    Capability.RUN_DUTY,
    Capability.CLAIM_SLOT,
    Capability.SCAN_BOARDING,
    Capability.VIEW_OWN_EARNINGS,
  ]),
  [Role.OPERATIONS]: new Set([
    Capability.VIEW_QUEUE,
    Capability.VIEW_LIVEMAP,
    Capability.APPROVE_DRIVER,
    Capability.MANAGE_VEHICLES,
    Capability.MANAGE_STOPS,
    Capability.MANAGE_ROUTES,
  ]),
  [Role.MANAGER]: new Set([
    Capability.VIEW_QUEUE,
    Capability.VIEW_LIVEMAP,
    Capability.EDIT_PRICING,
    Capability.MANAGE_PROMOTIONS,
    Capability.VIEW_ANALYTICS,
  ]),
  [Role.SUPPORT]: new Set([
    Capability.SUPPORT_LOOKUP,
    Capability.SUPPORT_REFUND,
    Capability.SUPPORT_TICKETS,
  ]),
  [Role.SUPER_ADMIN]: new Set(Object.values(Capability)),
};

/** True when `role` holds `capability`; unknown capabilities deny by default. */
export function can(role: Role | undefined | null, capability: Capability): boolean {
  if (!role) return false;
  return MATRIX[role]?.has(capability) ?? false;
}

/** Throws ForbiddenException (message_key auth.forbidden) unless allowed. */
export function assertCan(role: Role | undefined | null, capability: Capability): void {
  if (!can(role, capability)) {
    throw new ForbiddenException({ message_key: 'auth.forbidden', details: { capability } });
  }
}

/** The system-admin role is RESERVED (DEC-196): the env-seeded account is the
    only super_admin, so granting or setting that role is never allowed — not
    even by the super_admin itself. This lives here because it is a role
    decision, and the resolver is the one place role decisions are made. */
export function assertGrantableStaffRole(role: Role): void {
  if (role === Role.SUPER_ADMIN) {
    throw new ForbiddenException({ message_key: 'auth.super_admin_reserved' });
  }
}

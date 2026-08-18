/* ══════════════════════════════════════════════════════════════════════
   Drivers service — application layer. Business rules (state machine,
   authority) live here and in domain/; persistence in infra/.
   ══════════════════════════════════════════════════════════════════════ */
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DriversRepository, type DriverProfileRow } from '../infra/drivers.repository.js';
import { AuditService } from '../../audit/contracts/public.js';
import { assertCan, Capability, Role } from '../../../security/authority/authority.resolver.js';
import { assertTransition, DRIVER_TRANSITIONS, VEHICLE_TRANSITIONS } from '../domain/state-machine.js';
import type { Actor } from '../../identity/contracts/types.js';

@Injectable()
export class DriversService {
  constructor(
    private readonly drivers: DriversRepository,
    private readonly audit: AuditService
  ) {}

  /** A rider (or driver) applies to drive. Idempotent per account. */
  async apply(actor: Actor): Promise<DriverProfileRow> {
    assertCan(actor.role as unknown as Role, Capability.APPLY_AS_DRIVER);
    const existing = await this.drivers.findByUserId(actor.id);
    if (existing) {
      if (existing.status === 'approved') {
        throw new ConflictException({ message_key: 'drivers.already_approved' });
      }
      return existing;
    }
    const created = await this.drivers.createApplication(actor.id);
    await this.audit.record(actor, 'driver.apply', { targetType: 'driver_profile', targetId: created.id });
    return created;
  }

  async myProfile(actor: Actor): Promise<DriverProfileRow | null> {
    return this.drivers.findByUserId(actor.id);
  }

  async addVehicle(actor: Actor, plate: string, model: string, colour: string) {
    const profile = await this.drivers.findByUserId(actor.id);
    if (!profile || profile.status !== 'approved') {
      throw new ForbiddenException({ message_key: 'drivers.must_be_approved' });
    }
    return this.drivers.addVehicle(actor.id, plate, model, colour);
  }

  async listApplications(actor: Actor) {
    assertCan(actor.role as unknown as Role, Capability.APPROVE_DRIVER);
    return this.drivers.listApplications();
  }

  async reviewApplication(actor: Actor, id: string, decision: 'approve' | 'reject', reason: string | null) {
    assertCan(actor.role as unknown as Role, Capability.APPROVE_DRIVER);
    const app = (await this.drivers.listApplications()).find((a) => a.id === id);
    if (!app) throw new NotFoundException({ message_key: 'drivers.application_not_found' });
    const to = decision === 'approve' ? 'approved' : 'rejected';
    // The verification state machine is submitted → under_review → approved.
    // A fresh application being approved passes through under_review first —
    // one legal step at a time, never a jump.
    let from = app.status;
    if (to === 'approved' && from === 'submitted') {
      assertTransition(DRIVER_TRANSITIONS, from, 'under_review', 'driver application');
      from = 'under_review';
    }
    assertTransition(DRIVER_TRANSITIONS, from, to, 'driver application');

    if (to === 'approved') {
      await this.drivers.approveApplication(id, app.user_id, reason);
    } else {
      await this.drivers.setStatus(id, 'rejected', reason);
    }
    await this.audit.record(actor, `driver.${decision}`, {
      targetType: 'driver_profile', targetId: id, after: { status: to }, reason,
    });
    return { ok: true };
  }

  async listVehicles(actor: Actor) {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_VEHICLES);
    return this.drivers.listVehicles();
  }

  async reviewVehicle(actor: Actor, id: string, decision: 'approve' | 'reject') {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_VEHICLES);
    const vehicle = await this.drivers.findVehicle(id);
    if (!vehicle) throw new NotFoundException({ message_key: 'vehicles.not_found' });
    const to = decision === 'approve' ? 'approved' : 'rejected';
    // Same rule as drivers: submitted → under_review → approved.
    let from = vehicle.status;
    if (to === 'approved' && from === 'submitted') {
      assertTransition(VEHICLE_TRANSITIONS, from, 'under_review', 'vehicle');
      from = 'under_review';
    }
    assertTransition(VEHICLE_TRANSITIONS, from, to, 'vehicle');
    await this.drivers.setVehicleStatus(id, to);
    await this.audit.record(actor, `vehicle.${decision}`, {
      targetType: 'vehicle', targetId: id, after: { status: to },
    });
    return { ok: true };
  }
}

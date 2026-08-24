/* Audit service — the single writer of the append-only audit log (CH02 §2.4.2).
   Owns its own minimal actor shape: audit must not depend on the identity
   module, or the two would form a cycle (CH8a §8a.2 — a cycle means a third
   concept is missing). */
import { Injectable } from '@nestjs/common';
import { AuditRepository } from '../infra/audit.repository.js';
import { assertCan, Capability, Role } from '../../../security/authority/authority.resolver.js';

export interface AuditActor {
  id: string;
  role: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly audit: AuditRepository) {}

  async record(actor: AuditActor | null, action: string, entry: {
    targetType?: string;
    targetId?: string;
    before?: unknown;
    after?: unknown;
    reason?: string | null;
  } = {}): Promise<void> {
    await this.audit.append({
      actor_id: actor?.id ?? null,
      action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      before: entry.before,
      after: entry.after,
      reason: entry.reason ?? null,
    });
  }

  /** Super Admin only (CH02 §2.4: "View audit log" is Admin). */
  async list(actor: AuditActor, limit = 25, offset = 0): Promise<{ items: unknown[]; total: number; limit: number; offset: number }> {
    assertCan(actor.role as unknown as Role, Capability.VIEW_AUDIT);
    const lim = Math.min(Math.max(1, Math.floor(limit)), 100);
    const off = Math.max(0, Math.floor(offset));
    const page = await this.audit.list(lim, off);
    return { items: page.items, total: page.total, limit: lim, offset: off };
  }
}

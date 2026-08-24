import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from '../infra/notifications.repository.js';
import { assertCan, Capability, Role } from '../../../security/authority/authority.resolver.js';
import type { Actor } from '../../identity/contracts/types.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly notes: NotificationsRepository) {}

  async notify(input: {
    userId: string; kind: string;
    titleEn: string; titleAr: string; bodyEn: string; bodyAr: string;
    refType?: string; refId?: string;
  }) {
    return this.notes.create(input);
  }

  async mine(actor: Actor) {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_OWN_ACCOUNT);
    return this.notes.forUser(actor.id);
  }
}

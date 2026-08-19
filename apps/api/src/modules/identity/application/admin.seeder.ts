/* ══════════════════════════════════════════════════════════════════════
   Admin seeder — the system ships with ONE bootstrap admin (DEC — env vars).
   Runs on every boot, idempotently: creates the super_admin only if none
   exists. The password is NEVER logged; only the email is announced.
   ══════════════════════════════════════════════════════════════════════ */
import { Inject, Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { CONFIG, type Env } from '../../../config/env.js';
import { PinoLoggerService } from '../../../common/logging/logger.js';
import { hashPassword } from '../domain/password.js';
import { UsersRepository } from '../infra/users.repository.js';

@Injectable()
export class AdminSeeder implements OnApplicationBootstrap {
  constructor(
    @Inject(CONFIG) private readonly env: Env,
    private readonly logger: PinoLoggerService,
    private readonly users: UsersRepository
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.env.ADMIN_EMAIL;
    const password = this.env.ADMIN_PASSWORD;
    if (!email && !password) return;
    if (!email || !password) {
      this.logger.warn('ADMIN_EMAIL and ADMIN_PASSWORD must be set together — skipping seed');
      return;
    }
    const existing = await this.users.findByEmail(email);
    if (existing) {
      // Backfill: an admin seeded before 0010 must still be THE system admin.
      if (!existing.is_system_admin) await this.users.markSystemAdmin(existing.id);
      return;
    }
    await this.users.create({ email, role: 'super_admin', passwordHash: hashPassword(password), isSystemAdmin: true });
    this.logger.warn(`seeded bootstrap admin: ${email}`);
  }
}

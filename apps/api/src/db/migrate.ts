/* ══════════════════════════════════════════════════════════════════════
   Migrations on boot (DEC-170 mitigation 4, single-instance deployment).
   Runs `node-pg-migrate up` against DATABASE_URL before the app starts —
   idempotent, guarded by the tool's advisory lock. Controlled by
   AUTO_MIGRATE (default 'true'); set 'false' to migrate out-of-band (e.g.
   multiple replicas, where exactly one instance should migrate).
   The migrations directory resolves relative to this file:
     <repo>/apps/api/dist/db → <repo>/infra/migrations
     <container>/app/apps/api/dist/db → <container>/app/infra/migrations
   ══════════════════════════════════════════════════════════════════════ */
import { resolve } from 'node:path';
import { runner } from 'node-pg-migrate';

export async function runMigrations(databaseUrl: string, log: (m: string) => void = () => undefined, dirOverride?: string): Promise<void> {
  const dir = dirOverride ?? resolve(__dirname, '..', '..', '..', '..', 'infra', 'migrations');
  log(`running migrations from ${dir}`);
  await runner({
    databaseUrl,
    dir,
    migrationsTable: 'pgmigrations',
    direction: 'up',
    count: Infinity,
    log: () => undefined, // node-pg-migrate's own noise is not structured
  });
  log('migrations complete');
}

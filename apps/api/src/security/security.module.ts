/* ══════════════════════════════════════════════════════════════════════
   Security module (§0.3, §8.2). Exports the single authority resolver and
   its guard so every feature module consumes the SAME decision point.
   Helmet, CORS and rate limiting are applied at bootstrap (app.module +
   main.ts) because they configure the Fastify instance.
   ══════════════════════════════════════════════════════════════════════ */
import { Global, Module } from '@nestjs/common';
import { AuthorityGuard } from './authority/authority.guard.js';

@Global()
@Module({
  providers: [AuthorityGuard],
  exports: [AuthorityGuard],
})
export class SecurityModule {}

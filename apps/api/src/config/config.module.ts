/* ══════════════════════════════════════════════════════════════════════
   Config module. Provides the validated configuration (CONFIG token) to
   every module, exactly once. Global, so feature modules never import it —
   they just inject @Inject(CONFIG). loadEnv() remains the single reader of
   process.env (P0.3), enforced by lint.
   ══════════════════════════════════════════════════════════════════════ */
import { Global, Module } from '@nestjs/common';
import { CONFIG, loadEnv } from './env.js';

@Global()
@Module({
  providers: [{ provide: CONFIG, useFactory: () => loadEnv() }],
  exports: [CONFIG],
})
export class ConfigModule {}

/* ══════════════════════════════════════════════════════════════════════
   One request context (§0.3, P0.6): a request id, the actor's locale and
   city. Attached once, before any handler, so every error, log and
   response can be correlated to the request that caused it.
   ══════════════════════════════════════════════════════════════════════ */
import { randomUUID } from 'node:crypto';
import type { NestMiddleware } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';

export interface RequestContext {
  requestId: string;
  locale: string;
  city: string | null;
}

export class RequestContextMiddleware implements NestMiddleware {
  use(req: FastifyRequest, _res: FastifyReply, next: () => void): void {
    const headers = req.headers as Record<string, unknown>;
    const locale = typeof headers['x-locale'] === 'string' ? headers['x-locale'] : 'en';
    const city = typeof headers['x-city'] === 'string' ? headers['x-city'] : null;
    // Fastify assigns req.id to every request (even 404s); fall back to a uuid.
    const ctx: RequestContext = { requestId: req.id ?? randomUUID(), locale, city };
    (req as unknown as { ctx?: RequestContext }).ctx = ctx;
    next();
  }
}

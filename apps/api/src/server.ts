/* ══════════════════════════════════════════════════════════════════════
   Minimal HTTP server (M0, P0.4). Answers /health and /healthz with
   process liveness so the platform's health checks and the local compose
   stack have something real to hit. The full NestJS application — with
   the one error shape { code, message_key, details, request_id }, the
   single request context and the single authority resolver — replaces
   this in P0.6, at which point /health also reports database and Redis
   status (and returns 503 when either is down).
   ══════════════════════════════════════════════════════════════════════ */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Env } from './config/env.js';

/** Pure request handler — exported so tests can exercise it without a port. */
export function handler(_env: Env) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    const url = (req.url || '/').split('?')[0];
    if (url === '/healthz' || url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'api' }));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: false, code: 'NOT_FOUND' }));
  };
}

export function start(env: Env): void {
  const server = createServer(handler(env));
  server.listen(env.PORT, '0.0.0.0', () => {
    process.stderr.write(`api listening on :${env.PORT}\n`);
  });
}

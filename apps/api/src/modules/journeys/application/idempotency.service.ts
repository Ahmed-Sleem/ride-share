/* Replay-safe execution of a driver mutation (P7.2). Same actor + key
   returns the stored body. A second actor on the same key is refused. */
import { ForbiddenException, Injectable } from '@nestjs/common';
import { IdempotencyRepository } from '../infra/idempotency.repository.js';

@Injectable()
export class IdempotencyService {
  constructor(private readonly receipts: IdempotencyRepository) {}

  async run<T>(actorId: string, rawKey: string | undefined, fn: () => Promise<T>): Promise<T> {
    const key = normaliseKey(rawKey);
    if (!key) return fn();
    const hit = await this.receipts.find(key);
    if (hit) {
      if (hit.actor_id !== actorId) {
        throw new ForbiddenException({ message_key: 'auth.forbidden' });
      }
      return hit.body as T;
    }
    const result = await fn();
    const inserted = await this.receipts.insert(key, actorId, result ?? {});
    if (inserted === 'exists') {
      const again = await this.receipts.find(key);
      if (again && again.actor_id === actorId) return again.body as T;
      throw new ForbiddenException({ message_key: 'auth.forbidden' });
    }
    return result;
  }
}

export function normaliseKey(raw: string | undefined): string | null {
  if (!raw) return null;
  const k = String(raw).trim();
  if (k.length < 8 || k.length > 128) return null;
  if (!/^[A-Za-z0-9._:-]+$/.test(k)) return null;
  return k;
}

export function readIdempotencyKey(headers: Record<string, unknown> | undefined): string | undefined {
  if (!headers) return undefined;
  const v = headers['idempotency-key'] ?? headers['Idempotency-Key'];
  if (Array.isArray(v)) return v[0] !== undefined && v[0] !== null ? String(v[0]) : undefined;
  return v !== undefined && v !== null ? String(v) : undefined;
}

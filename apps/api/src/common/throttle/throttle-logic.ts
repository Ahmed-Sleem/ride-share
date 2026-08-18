/* ══════════════════════════════════════════════════════════════════════
   Throttle state transition — the pure heart of the rate limiter, extracted
   so the semantics are unit-testable without a database (the Postgres storage
   in postgres-throttler-storage.ts only reads/writes this state).

   Model: a sliding window per throttler name. Each hit is a timestamp that
   lives `ttl` milliseconds; this reproduces @nestjs/throttler's in-memory
   per-hit expiry (its setTimeout decrement) exactly, so swapping the store
   does not change behaviour (§0.3 one implementation):

   - a request counts against `throttlerName` for the key;
   - once the count exceeds `limit`, the key is BLOCKED for `blockDuration`;
   - while blocked every request is refused and not counted;
   - when the block lapses, the key is reset and the current request is the
     first hit of a fresh window.
   Reported timeouts are whole seconds (ceil), matching the library.
   ══════════════════════════════════════════════════════════════════════ */

export interface ThrottleState {
  /** per-throttler hit timestamps (epoch ms), ascending */
  hits: Record<string, number[]>;
  /** block end (epoch ms); 0 = not blocked */
  blockedUntil: number;
}

/** The record shape the throttler guard expects (mirrors @nestjs/throttler). */
export interface ThrottleRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

export interface ThrottleResult extends ThrottleRecord {
  state: ThrottleState;
}

const ceilSeconds = (ms: number) => Math.ceil(ms / 1000);

/** Drop hits older than the sliding window (keeps arrays ascending). */
function prune(hits: Record<string, number[]>, now: number, ttl: number): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const [name, times] of Object.entries(hits)) {
    const live = times.filter((t) => t > now - ttl);
    if (live.length) out[name] = live;
  }
  return out;
}

export function nextThrottleState(
  prev: ThrottleState | null,
  now: number,
  ttl: number,
  limit: number,
  blockDuration: number,
  throttlerName: string
): ThrottleResult {
  const hits = prev ? prune(prev.hits, now, ttl) : {};
  let blockedUntil = prev ? prev.blockedUntil : 0;
  if (blockedUntil <= now) blockedUntil = 0; // block lapsed (or never existed)
  let isBlocked = blockedUntil > 0;
  let timeToBlockExpire = isBlocked ? ceilSeconds(blockedUntil - now) : 0;

  if (!isBlocked) {
    (hits[throttlerName] ||= []).push(now);
  }

  const totalHits = (hits[throttlerName] || []).length;
  if (!isBlocked && totalHits > limit) {
    isBlocked = true;
    blockedUntil = now + blockDuration;
    timeToBlockExpire = ceilSeconds(blockDuration);
  }

  // window remaining = oldest live hit + ttl (whole seconds)
  let oldest = Infinity;
  for (const times of Object.values(hits)) {
    const first = times[0];
    if (times.length && first !== undefined && first < oldest) oldest = first;
  }
  const timeToExpire = ceilSeconds(((oldest === Infinity ? now : oldest) + ttl - now));

  return {
    state: { hits, blockedUntil },
    totalHits,
    timeToExpire,
    isBlocked,
    timeToBlockExpire,
  };
}

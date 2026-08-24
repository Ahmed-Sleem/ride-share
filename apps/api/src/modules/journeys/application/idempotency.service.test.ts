import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IdempotencyService, normaliseKey } from './idempotency.service.js';

function fakeRepo(store: Map<string, { actor_id: string; body: unknown }>) {
  return {
    find: async (key: string) => {
      const row = store.get(key);
      return row ? { key, actor_id: row.actor_id, body: row.body, created_at: new Date() } : null;
    },
    insert: async (key: string, actorId: string, body: unknown) => {
      if (store.has(key)) return 'exists' as const;
      store.set(key, { actor_id: actorId, body });
      return 'ok' as const;
    },
  };
}

test('normaliseKey rejects short or dirty keys', () => {
  assert.equal(normaliseKey(''), null);
  assert.equal(normaliseKey('abc'), null);
  assert.equal(normaliseKey('good-key-01'), 'good-key-01');
  assert.equal(normaliseKey('bad key'), null);
});

test('same actor + key returns the first body without re-running', async () => {
  const store = new Map();
  const svc = new IdempotencyService(fakeRepo(store) as never);
  let n = 0;
  const a = await svc.run('u1', 'key-aaaa-1', async () => { n += 1; return { ok: true, n }; });
  const b = await svc.run('u1', 'key-aaaa-1', async () => { n += 1; return { ok: true, n }; });
  assert.deepEqual(a, { ok: true, n: 1 });
  assert.deepEqual(b, { ok: true, n: 1 });
  assert.equal(n, 1);
});

test('a different actor on the same key is refused', async () => {
  const store = new Map();
  const svc = new IdempotencyService(fakeRepo(store) as never);
  await svc.run('u1', 'key-bbbb-2', async () => ({ ok: true }));
  await assert.rejects(() => svc.run('u2', 'key-bbbb-2', async () => ({ ok: true })));
});

test('no key always runs', async () => {
  const store = new Map();
  const svc = new IdempotencyService(fakeRepo(store) as never);
  let n = 0;
  await svc.run('u1', undefined, async () => { n += 1; return 1; });
  await svc.run('u1', undefined, async () => { n += 1; return 2; });
  assert.equal(n, 2);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendFcm } from './fcm.sender.js';

test('no key → skipped (honest, not a fake success)', async () => {
  const r = await sendFcm({ serverKey: undefined, token: 't', title: 'A', body: 'B', data: {} });
  assert.equal(r.status, 'skipped');
});

test('provider 500 → failed', async () => {
  const r = await sendFcm({
    serverKey: 'k', token: 't', title: 'A', body: 'B', data: {},
    fetchImpl: async () => ({ ok: false, status: 500 }) as Response,
  });
  assert.equal(r.status, 'failed');
});

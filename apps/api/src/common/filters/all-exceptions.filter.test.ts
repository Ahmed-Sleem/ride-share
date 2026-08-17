/* One error shape, proved: handled and unhandled errors produce the SAME
   shape, differing only in code and message_key (P0.6). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArgumentsHost, HttpException } from '@nestjs/common';
import { AllExceptionsFilter, type ErrorBody } from './all-exceptions.filter.js';

function host(requestId?: string): ArgumentsHost {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => ({ ctx: { requestId } }),
    }),
  } as unknown as ArgumentsHost;
}

test('handled error renders the standard shape with request id', () => {
  const filter = new AllExceptionsFilter();
  const h = host('req-123');
  filter.catch(new HttpException('rides.not_found', 404), h);
  const res = (h.switchToHttp().getResponse() as unknown as { statusCode: number; body: ErrorBody });
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.code, 'NOT_FOUND');
  assert.equal(res.body.message_key, 'rides.not_found');
  assert.equal(res.body.request_id, 'req-123');
});

test('unexpected error renders INTERNAL with a generic key (no internals leaked)', () => {
  const filter = new AllExceptionsFilter();
  const h = host('req-456');
  filter.catch(new Error('secret internal detail'), h);
  const res = (h.switchToHttp().getResponse() as unknown as { statusCode: number; body: ErrorBody });
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.code, 'INTERNAL');
  assert.equal(res.body.message_key, 'error.internal');
  assert.equal(JSON.stringify(res.body).includes('secret internal detail'), false);
});

test('prose messages are mapped to translation keys, never sent raw', () => {
  const filter = new AllExceptionsFilter();
  const h = host();
  filter.catch(new HttpException('Cannot GET /nope', 404), h);
  const res = (h.switchToHttp().getResponse() as unknown as { statusCode: number; body: ErrorBody });
  assert.equal(res.body.message_key, 'error.not_found');
  assert.equal(res.body.code, 'NOT_FOUND');
});

test('object-shaped HttpException keeps its message_key and details', () => {
  const filter = new AllExceptionsFilter();
  const h = host();
  filter.catch(new HttpException({ message_key: 'auth.forbidden', details: { capability: 'pricing.edit' } }, 403), h);
  const res = (h.switchToHttp().getResponse() as unknown as { statusCode: number; body: ErrorBody });
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message_key, 'auth.forbidden');
  assert.deepEqual(res.body.details, { capability: 'pricing.edit' });
});

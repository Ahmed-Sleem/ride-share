/* Authority resolver tests (§8.2). The resolver is the ONLY decision point;
   these prove the matrix, the deny-by-default rule, and the throw path. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
import { assertCan, can, Capability, Role } from './authority.resolver.js';

test('rider can book but cannot approve drivers', () => {
  assert.equal(can(Role.RIDER, Capability.BOOK_RIDE), true);
  assert.equal(can(Role.RIDER, Capability.APPROVE_DRIVER), false);
});

test('support can refund (bounded) but cannot edit pricing', () => {
  assert.equal(can(Role.SUPPORT, Capability.SUPPORT_REFUND), true);
  assert.equal(can(Role.SUPPORT, Capability.EDIT_PRICING), false);
});

test('manager can edit pricing but cannot scan boarding codes', () => {
  assert.equal(can(Role.MANAGER, Capability.EDIT_PRICING), true);
  assert.equal(can(Role.MANAGER, Capability.SCAN_BOARDING), false);
});

test('super admin holds every capability', () => {
  assert.equal(can(Role.SUPER_ADMIN, Capability.MANAGE_CONFIG), true);
  assert.equal(can(Role.SUPER_ADMIN, Capability.APPROVE_DRIVER), true);
  assert.equal(can(Role.SUPER_ADMIN, Capability.VIEW_AUDIT), true);
});

test('no role denies by default', () => {
  assert.equal(can(undefined, Capability.BOOK_RIDE), false);
  assert.equal(can(null, Capability.BOOK_RIDE), false);
});

test('assertCan throws auth.forbidden on denial', () => {
  assert.throws(
    () => assertCan(Role.RIDER, Capability.EDIT_PRICING),
    (err: Error) => {
      assert.equal(err instanceof ForbiddenException, true);
      const body = (err as ForbiddenException).getResponse() as { message_key: string };
      return body.message_key === 'auth.forbidden';
    }
  );
});

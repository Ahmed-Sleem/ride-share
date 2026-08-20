/* Stops service tests — repository fake, no database. Proves the duplicate
   guard, coordinate bounds, authority, the public-verified-only rule and the
   two-person verification rule. Each has been observed failing (§0.2). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StopsService } from './stops.service.js';
import type { Env } from '../../../config/env.js';
import type { StopRow } from '../contracts/types.js';

class FakeStops {
  rows = new Map<string, StopRow>();
  verifications: unknown[] = [];
  photos: Record<string, { storage_key: string; mime_type: string }> = {};
  seq = 0;
  async create(i: any) {
    const id = `s${++this.seq}`;
    const row: StopRow = {
      id, code: i.code, name_en: i.nameEn, name_ar: i.nameAr, lat: i.lat, lng: i.lng,
      status: 'draft', source: i.source, created_by: i.createdBy,
      stand_ok: null, lit_ok: null, legal_stop_ok: null, reachable_ok: null,
      walking_to_next_m: null, override_reason: i.overrideReason ?? null,
      capture_id: null, gps_accuracy_m: null, created_at: new Date(),
    };
    this.rows.set(id, row);
    return row;
  }
  async createMany(inputs: any[]) { const out = []; for (const i of inputs) out.push(await this.create(i)); return out; }
  async findByCaptureId(cid: string) { return [...this.rows.values()].find((r) => r.capture_id === cid) ?? null; }
  async createFieldCapture(i: any) {
    const id = `s${++this.seq}`;
    const row = { id, code: i.code, name_en: i.nameEn ?? '', name_ar: i.nameAr ?? '', lat: i.lat, lng: i.lng,
      status: 'pending' as const, source: 'field' as const, created_by: i.createdBy,
      stand_ok: i.checklist.stand, lit_ok: i.checklist.lit, legal_stop_ok: i.checklist.legal, reachable_ok: i.checklist.reachable,
      walking_to_next_m: null, override_reason: null, capture_id: i.captureId, gps_accuracy_m: i.gpsAccuracyM, created_at: new Date() };
    this.rows.set(id, row); return row;
  }
  async addPhoto(stopId: string, storageKey: string, mimeType: string) {
    this.photos = this.photos || {};
    this.photos[stopId] = { storage_key: storageKey, mime_type: mimeType };
    return { id: `p${Object.keys(this.photos).length}`, stop_id: stopId, storage_key: storageKey, mime_type: mimeType, taken_at: null, created_at: new Date() };
  }
  async photoForStop(stopId: string) { return (this.photos && this.photos[stopId]) || null; }
  async findById(id: string) { return this.rows.get(id) ?? null; }
  async candidatesInBox() { return [...this.rows.values()]; }
  async verifiedInBox() { return [...this.rows.values()].filter((s) => s.status === 'verified'); }
  async listByStatus(ss: string[]) { return [...this.rows.values()].filter((s) => ss.includes(s.status)); }
  async setStatus(id: string, status: any) { const r = this.rows.get(id); if (r) this.rows.set(id, { ...r, status }); }
  async appendVerification(v: any) { this.verifications.push(v); return { ...v, id: `v${this.verifications.length}`, created_at: new Date() }; }
}
class FakeAudit { entries: unknown[] = []; async record(...a: unknown[]) { this.entries.push(a); } }

const env = () => ({
  NODE_ENV: 'development', PORT: 3000, LOG_LEVEL: 'info', DATABASE_URL: 'x',
  JWT_SECRET: 'c'.repeat(32), CORS_ORIGINS: '', THROTTLE_TTL: 60000, THROTTLE_LIMIT: 100,
  SMTP_PORT: 587, SMTP_SECURE: 'auto', AUTO_MIGRATE: 'true', EMAIL_ALLOWED_DOMAINS: '',
  AUTH_OTP_BYPASS: 'false', STOP_MIN_SPACING_M: 100, STOP_MAX_GAP_M: 1000,
  STOP_MAX_FIX_ACCURACY_M: 20, PHOTO_STORAGE_DIR: '/tmp/rs-photos-test', PHOTO_MAX_BYTES: 8_000_000,
}) as unknown as Env;

function setup() {
  const stops = new FakeStops();
  const audit = new FakeAudit();
  const svc = new StopsService(env(), stops as never, audit as never);
  return { svc, stops, audit };
}
const ops = { id: 'u1', role: 'operations' as const };
const ops2 = { id: 'u9', role: 'operations' as const };
const rider = { id: 'u3', role: 'rider' as const };

test('operations can create a stop; it persists the exact coordinate', async () => {
  const { svc } = setup();
  const s = await svc.createStop(ops, { nameEn: 'Gate 2', lat: 31.245678, lng: 29.983901, source: 'desk' });
  assert.equal(s.lat, 31.245678);
  assert.equal(s.lng, 29.983901);
  assert.equal(s.status, 'draft');
});

test('a rider cannot create a stop (§8.2 authority)', async () => {
  const { svc } = setup();
  await assert.rejects(() => svc.createStop(rider, { lat: 31.2, lng: 29.9, source: 'desk' }), ForbiddenException);
});

test('impossible coordinates are refused', async () => {
  const { svc } = setup();
  await assert.rejects(() => svc.createStop(ops, { lat: 91, lng: 0, source: 'desk' }), ConflictException);
});

test('a second stop within the minimum spacing is refused without a reason', async () => {
  const { svc } = setup();
  await svc.createStop(ops, { lat: 31.2, lng: 29.9, source: 'desk' });
  // ~55 m away — inside STOP_MIN_SPACING_M=100
  await assert.rejects(
    () => svc.createStop(ops, { lat: 31.2, lng: 29.9005, source: 'desk' }),
    (e: unknown) => e instanceof ConflictException && JSON.stringify((e as any).getResponse()).includes('geo.stop_too_close')
  );
});

test('an explicit override + reason lets a close stop through', async () => {
  const { svc } = setup();
  await svc.createStop(ops, { lat: 31.2, lng: 29.9, source: 'desk' });
  const s = await svc.createStop(ops, { lat: 31.2, lng: 29.9005, source: 'desk', overrideReason: 'opposite kerb of a dual carriageway' });
  assert.equal(s.override_reason, 'opposite kerb of a dual carriageway');
});

test('the public near query returns verified stops ONLY', async () => {
  const { svc, stops } = setup();
  const verified = await svc.createStop(ops, { lat: 31.2, lng: 29.9, source: 'desk' });
  await svc.createStop(ops, { lat: 31.21, lng: 29.91, source: 'desk' }); // stays draft
  await stops.setStatus(verified.id, 'verified');
  const near = await svc.verifiedNear(31.2, 29.9, 5000);
  assert.equal(near.length, 1, 'only the verified stop leaks');
  assert.equal(near[0]!.id, verified.id);
});

test('the two-person rule: the author cannot verify their own stop', async () => {
  const { svc } = setup();
  const s = await svc.createStop(ops, { lat: 31.2, lng: 29.9, source: 'desk' });
  await assert.rejects(
    () => svc.reviewStop(ops, s.id, 'approved'),
    (e: unknown) => e instanceof ForbiddenException && JSON.stringify((e as any).getResponse()).includes('geo.cannot_self_verify')
  );
});

test('a different administrator can verify it; rejection requires a reason', async () => {
  const { svc } = setup();
  const s = await svc.createStop(ops, { lat: 31.2, lng: 29.9, source: 'desk' });
  await assert.rejects(() => svc.reviewStop(ops2, s.id, 'rejected'), (e: unknown) =>
    e instanceof ForbiddenException && JSON.stringify((e as any).getResponse()).includes('geo.rejection_requires_reason'));
  await svc.reviewStop(ops2, s.id, 'approved');
  const listed = await svc.list(ops2, ['verified']);
  assert.ok(listed.some((x) => x.id === s.id), 'the stop is now verified');
});

test('reviewing a missing stop is a not-found', async () => {
  const { svc } = setup();
  await assert.rejects(() => svc.reviewStop(ops2, 'missing', 'approved'), NotFoundException);
});

test('CSV import creates every stop; a malformed row aborts with zero created', async () => {
  const { svc, stops } = setup();
  const good = '31.201,29.901,A\n31.202,29.902,B\n31.203,29.903,C';
  const res = await svc.importStops(ops, good);
  assert.equal(res.imported, 3);
  assert.equal([...stops.rows.values()].length, 3);
  // all-or-nothing: a bad row aborts BEFORE any insert
  await assert.rejects(
    () => svc.importStops(ops, '31.3,29.9,Ok\nbad,Bad\n'),
    (e: unknown) => e instanceof BadRequestException && JSON.stringify((e as any).getResponse()).includes('geo.csv_invalid')
  );
  assert.equal([...stops.rows.values()].length, 3, 'no partial import');
});

test('CSV import refuses an out-of-bounds coordinate', async () => {
  const { svc } = setup();
  await assert.rejects(
    () => svc.importStops(ops, '191,29.9,Bad latitude'),
    (e: unknown) => e instanceof BadRequestException && JSON.stringify((e as any).getResponse()).includes('geo.coordinates_out_of_bounds')
  );
});

test('a rider cannot import stops (§8.2 authority)', async () => {
  const { svc } = setup();
  await assert.rejects(() => svc.importStops(rider, '31.2,29.9,X'), ForbiddenException);
});

test('submit moves a draft to pending; a verified stop cannot be resubmitted', async () => {
  const { svc } = setup();
  const s = await svc.createStop(ops, { lat: 31.2, lng: 29.9, source: 'desk' });
  await svc.submitStop(ops, s.id);
  const pending = await svc.list(ops, ['pending']);
  assert.ok(pending.some((x) => x.id === s.id), 'draft → pending');
  await svc.reviewStop(ops2, s.id, 'approved');
  await assert.rejects(() => svc.submitStop(ops, s.id), ConflictException);
});

test('field capture: an inaccurate fix is refused, an accurate one becomes pending', async () => {
  const { svc, stops } = setup();
  const bad = { captureId: 'cap-00000001', lat: 31.2, lng: 29.9, gpsAccuracyM: 80,
    checklist: { stand: true, lit: true, legal: true, reachable: true } };
  await assert.rejects(
    () => svc.captureStop(ops, bad),
    (e: unknown) => e instanceof ConflictException && JSON.stringify((e as any).getResponse()).includes('geo.fix_too_inaccurate')
  );
  const good = { ...bad, captureId: 'cap-00000002', gpsAccuracyM: 8 };
  const s = await svc.captureStop(ops, good);
  assert.equal(s.status, 'pending');
  assert.equal(s.source, 'field');
  assert.equal(s.gps_accuracy_m, 8);
  assert.equal(stops.rows.get(s.id)!.stand_ok, true);
});

test('field capture: a partial checklist is refused', async () => {
  const { svc } = setup();
  await assert.rejects(
    () => svc.captureStop(ops, { captureId: 'cap-00000003', lat: 31.2, lng: 29.9, gpsAccuracyM: 8,
      checklist: { stand: true, lit: true, legal: true, reachable: false } }),
    (e: unknown) => e instanceof BadRequestException && JSON.stringify((e as any).getResponse()).includes('geo.checklist_incomplete')
  );
});

test('field capture is idempotent: the same capture id returns the SAME stop', async () => {
  const { svc, stops } = setup();
  const input = { captureId: 'cap-00000004', lat: 31.2, lng: 29.9, gpsAccuracyM: 8,
    checklist: { stand: true, lit: true, legal: true, reachable: true } };
  const first = await svc.captureStop(ops, input);
  const second = await svc.captureStop(ops, input);
  assert.equal(second.id, first.id);
  assert.equal([...stops.rows.values()].length, 1, 'no duplicate stop row');
});

test('field capture stores the photo with its EXIF stripped', async () => {
  const { svc, stops } = setup();
  const soi = Buffer.from([0xff, 0xd8]);
  const app1data = Buffer.from('Exif\0\0GPS 31.2', 'binary');
  const len = (n: number) => { const b = Buffer.alloc(2); b.writeUInt16BE(n, 0); return b; };
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), len(app1data.length), app1data]);
  const eoi = Buffer.from([0xff, 0xd9]);
  const jpeg = Buffer.concat([soi, app1, eoi]);
  const photoDataUrl = 'data:image/jpeg;base64,' + jpeg.toString('base64');

  const s = await svc.captureStop(ops, { captureId: 'cap-00000005', lat: 31.2, lng: 29.9,
    gpsAccuracyM: 8, checklist: { stand: true, lit: true, legal: true, reachable: true }, photoDataUrl });
  const photo = await svc.photoForStop(ops, s.id);
  assert.ok(photo, 'photo retrievable');
  assert.ok(!photo!.bytes.includes(Buffer.from('Exif', 'binary')), 'EXIF stripped before storage');
  assert.equal(stops.rows.get(s.id)!.status, 'pending');
});

test('retire: a verified stop retires; a draft cannot', async () => {
  const { svc } = setup();
  const s = await svc.createStop(ops, { lat: 31.2, lng: 29.9, source: 'desk' });
  await assert.rejects(() => svc.retireStop(ops, s.id), ConflictException); // draft
  await svc.submitStop(ops, s.id);
  await svc.reviewStop(ops2, s.id, 'approved');
  await svc.retireStop(ops, s.id);
  const listed = await svc.list(ops, ['retired']);
  assert.ok(listed.some((x) => x.id === s.id), 'now retired');
});

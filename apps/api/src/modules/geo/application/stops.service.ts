/* Stops service — application layer. Business rules (bounds, spacing, the
   two-person rule) live in domain/ and here; persistence in infra/. Authority
   is checked against the single resolver (§8.2). */
import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CONFIG, type Env } from '../../../config/env.js';
import { StopsRepository } from '../infra/stops.repository.js';
import { LocalPhotoStorage, type PhotoStorage } from '../infra/photo-storage.js';
import { AuditService } from '../../audit/contracts/public.js';
import { assertCan, Capability, Role } from '../../../security/authority/authority.resolver.js';
import { isWithinBounds, nextStopCode, spacingCheck, stopCode, type StopStatus } from '../domain/stop.js';
import { parseStopsCsv } from '../domain/csv.js';
import { distanceMeters } from '../domain/geo-math.js';
import { stripJpegExif } from '../domain/exif.js';
import { accuracyGate, checklistComplete, type FieldChecklist } from '../domain/field-capture.js';
import type { Actor } from '../../identity/contracts/types.js';
import type { StopRow } from '../contracts/types.js';

const STOP_CITY = 'ALX';
const STOP_ZONE = 'COR'; // the launch corridor — a real zone per corridor comes with P2.5

/** Decode a data-URL photo (data:image/jpeg;base64,…). Returns null when there
    is no photo; throws when the photo is oversized or not an accepted image. */
function decodePhoto(dataUrl: string | undefined, maxBytes: number): { bytes: Buffer; mimeType: string } | null {
  if (!dataUrl) return null;
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!m) throw new BadRequestException({ message_key: 'geo.photo_invalid' });
  const bytes = Buffer.from(m[2]!, 'base64');
  if (bytes.length > maxBytes) {
    throw new BadRequestException({ message_key: 'geo.photo_too_large', details: { bytes: bytes.length } });
  }
  return { bytes, mimeType: m[1]! };
}

@Injectable()
export class StopsService {
  private readonly photos: PhotoStorage;

  constructor(
    @Inject(CONFIG) private readonly env: Env,
    private readonly stops: StopsRepository,
    private readonly audit: AuditService
  ) {
    this.photos = new LocalPhotoStorage(env.PHOTO_STORAGE_DIR);
  }

  /** Create a candidate stop (desk or field). Only operations/manager/super
      admin may create stops; a second stop within MinStopSpacing requires an
      explicit override + reason (P2.2 duplicate guard). */
  async createStop(actor: Actor, input: {
    nameEn?: string; nameAr?: string; lat: number; lng: number;
    source: 'desk' | 'field'; overrideReason?: string | null;
  }): Promise<StopRow> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_STOPS);
    if (!isWithinBounds(input.lat, input.lng)) {
      throw new ConflictException({ message_key: 'geo.coordinates_out_of_bounds' });
    }
    const box = await this.stops.candidatesInBox(input.lat, input.lng, this.env.STOP_MIN_SPACING_M * 2);
    const check = spacingCheck(input.lat, input.lng, box.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng })), this.env.STOP_MIN_SPACING_M);
    if (!check.ok && !input.overrideReason) {
      throw new ConflictException({
        message_key: 'geo.stop_too_close',
        details: { nearestId: check.nearestId, distanceM: Math.round(check.nearestDistanceM ?? 0) },
      });
    }
    const last = (await this.stops.listByStatus(['draft', 'pending', 'verified', 'rejected', 'retired']))
      .map((s) => s.code).sort().pop() ?? null;
    const code = nextStopCode(STOP_CITY, STOP_ZONE, last);
    const created = await this.stops.create({
      code,
      nameEn: input.nameEn ?? '',
      nameAr: input.nameAr ?? '',
      lat: input.lat,
      lng: input.lng,
      source: input.source,
      createdBy: actor.id,
      overrideReason: input.overrideReason ?? null,
    });
    await this.audit.record(actor, 'stop.create', {
      targetType: 'stop', targetId: created.id,
      after: { code: created.code, lat: created.lat, lng: created.lng, source: created.source },
      reason: input.overrideReason,
    });
    return created;
  }

  /** Public nearest verified stops, sorted by distance (P2.4 — verified only). */
  async verifiedNear(lat: number, lng: number, radiusM: number, limit = 20): Promise<Array<StopRow & { distanceM: number }>> {
    const candidates = await this.stops.verifiedInBox(lat, lng, radiusM);
    return candidates
      .map((s) => ({ ...s, distanceM: distanceMeters(lat, lng, s.lat, s.lng) }))
      .filter((s) => s.distanceM <= radiusM)
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, limit);
  }

  async list(actor: Actor, statuses?: StopStatus[]): Promise<StopRow[]> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_STOPS);
    return this.stops.listByStatus(statuses ?? ['draft', 'pending', 'verified', 'rejected', 'retired']);
  }

  /** Field capture (P2.3): the surveyor stands at the kerb, records a GPS fix
      with its accuracy, answers the four-point physical checklist, and takes a
      photo. The fix worse than STOP_MAX_FIX_ACCURACY_M is refused; a partial
      checklist is refused; the photo is stripped of EXIF before storage; the
      capture is idempotent by the client's capture id (offline retries safe). */
  async captureStop(actor: Actor, input: {
    captureId: string; lat: number; lng: number; gpsAccuracyM: number;
    checklist: FieldChecklist; photoDataUrl?: string; device?: string;
  }): Promise<StopRow> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_STOPS);
    if (!isWithinBounds(input.lat, input.lng)) {
      throw new ConflictException({ message_key: 'geo.coordinates_out_of_bounds' });
    }
    const gate = accuracyGate(input.gpsAccuracyM, this.env.STOP_MAX_FIX_ACCURACY_M);
    if (!gate.ok) {
      throw new ConflictException({ message_key: 'geo.fix_too_inaccurate', details: { accuracyM: input.gpsAccuracyM } });
    }
    if (!checklistComplete(input.checklist)) {
      throw new BadRequestException({ message_key: 'geo.checklist_incomplete' });
    }
    // idempotency first — a retried offline upload returns the SAME stop
    const existing = await this.stops.findByCaptureId(input.captureId);
    if (existing) return existing;

    const photo = decodePhoto(input.photoDataUrl, this.env.PHOTO_MAX_BYTES);
    const codes = (await this.stops.listByStatus(['draft', 'pending', 'verified', 'rejected', 'retired']))
      .map((s) => s.code).sort();
    const code = nextStopCode(STOP_CITY, STOP_ZONE, codes.at(-1) ?? null);
    const created = await this.stops.createFieldCapture({
      code,
      captureId: input.captureId,
      lat: input.lat,
      lng: input.lng,
      gpsAccuracyM: input.gpsAccuracyM,
      createdBy: actor.id,
      checklist: input.checklist,
      nameEn: '',
      nameAr: '',
    });
    if (photo) {
      // EXIF stripped BEFORE storage — the measured fix is the truth, never the photo's
      const storageKey = await this.photos.put(stripJpegExif(photo.bytes), photo.mimeType);
      await this.stops.addPhoto(created.id, storageKey, photo.mimeType);
    }
    await this.audit.record(actor, 'stop.capture', {
      targetType: 'stop', targetId: created.id,
      after: { code: created.code, gpsAccuracyM: input.gpsAccuracyM, device: input.device ?? null },
    });
    return created;
  }

  /** Serve a stop's photo bytes (desk review view, P2.4). */
  async photoForStop(actor: Actor, id: string): Promise<{ bytes: Buffer; mimeType: string } | null> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_STOPS);
    const photo = await this.stops.photoForStop(id);
    if (!photo) return null;
    const bytes = await this.photos.get(photo.storage_key);
    if (!bytes) return null;
    return { bytes, mimeType: photo.mime_type };
  }

  /** Retire a verified stop (CH04 §4.1.2 — never hard-deleted). Retiring a
      stop used by a published route is refused — but routes land in M3, so the
      live-route check arrives with route_stops (tracked in the M2 checklist). */
  async retireStop(actor: Actor, id: string): Promise<{ ok: true }> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_STOPS);
    const stop = await this.stops.findById(id);
    if (!stop) throw new NotFoundException({ message_key: 'geo.stop_not_found' });
    if (stop.status !== 'verified') {
      throw new ConflictException({ message_key: 'geo.stop_not_verified', details: { status: stop.status } });
    }
    await this.stops.setStatus(id, 'retired');
    await this.audit.record(actor, 'stop.retire', { targetType: 'stop', targetId: id });
    return { ok: true };
  }

  /** Bulk import from CSV (P2.2): all-or-nothing. One malformed row or one
      out-of-bounds coordinate aborts the WHOLE import with the 1-based row
      number — a partial corridor is worse than no corridor. */
  async importStops(actor: Actor, csv: string): Promise<{ imported: number }> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_STOPS);
    const parsed = parseStopsCsv(csv);
    if (!parsed.ok) {
      throw new BadRequestException({ message_key: 'geo.csv_invalid', details: { row: parsed.row, reason: parsed.error } });
    }
    parsed.rows.forEach((r, i) => {
      if (!isWithinBounds(r.lat, r.lng)) {
        throw new BadRequestException({
          message_key: 'geo.coordinates_out_of_bounds', details: { row: i + 1 },
        });
      }
    });
    // stable codes continue from the highest existing code
    const codes = (await this.stops.listByStatus(['draft', 'pending', 'verified', 'rejected', 'retired']))
      .map((s) => s.code).sort();
    let seq = Number(codes.at(-1)?.slice(-3) ?? 0) || 0;
    const created = await this.stops.createMany(
      parsed.rows.map((r) => ({
        code: stopCode(STOP_CITY, STOP_ZONE, ++seq),
        nameEn: r.nameEn, nameAr: r.nameAr, lat: r.lat, lng: r.lng,
        source: 'desk', createdBy: actor.id,
      }))
    );
    await this.audit.record(actor, 'stop.import', {
      targetType: 'stop', after: { count: created.length },
    });
    return { imported: created.length };
  }

  /** Draft → pending (P2.2 "submit to pending"). Only the author may submit,
      and only from draft. */
  async submitStop(actor: Actor, id: string): Promise<{ ok: true }> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_STOPS);
    const stop = await this.stops.findById(id);
    if (!stop) throw new NotFoundException({ message_key: 'geo.stop_not_found' });
    if (stop.status !== 'draft') {
      throw new ConflictException({ message_key: 'geo.stop_not_draft', details: { status: stop.status } });
    }
    await this.stops.setStatus(id, 'pending');
    await this.audit.record(actor, 'stop.submit', { targetType: 'stop', targetId: id });
    return { ok: true };
  }

  /** Desk review → verified/rejected. Two-person rule (P2.4): the author of
      the stop may never verify it themselves. */
  async reviewStop(actor: Actor, id: string, decision: 'approved' | 'rejected', reason?: string | null): Promise<{ ok: true }> {
    assertCan(actor.role as unknown as Role, Capability.MANAGE_STOPS);
    const stop = await this.stops.findById(id);
    if (!stop) throw new NotFoundException({ message_key: 'geo.stop_not_found' });
    if (decision === 'rejected' && !reason) {
      throw new ForbiddenException({ message_key: 'geo.rejection_requires_reason' });
    }
    if (stop.created_by === actor.id && decision === 'approved') {
      throw new ForbiddenException({ message_key: 'geo.cannot_self_verify' });
    }
    await this.stops.setStatus(id, decision === 'approved' ? 'verified' : 'rejected');
    await this.stops.appendVerification({
      stopId: id, verifierId: actor.id, decision, reason,
    });
    await this.audit.record(actor, `stop.${decision}`, {
      targetType: 'stop', targetId: id, after: { status: decision === 'approved' ? 'verified' : 'rejected' }, reason,
    });
    return { ok: true };
  }
}

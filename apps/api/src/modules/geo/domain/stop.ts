/* ══════════════════════════════════════════════════════════════════════
   Stop domain rules — pure and tested (DEC-197 numeric model, CH04 §4.1.2):
   coordinate bounds, the stable public code, and the duplicate-spacing rule.
   Values are config, not magic: MinStopSpacing / MaxStopGap are tunable
   (env) with sane defaults recorded in config/env.ts.
   ══════════════════════════════════════════════════════════════════════ */

export type StopStatus = 'draft' | 'pending' | 'verified' | 'rejected' | 'retired';
export type StopSource = 'desk' | 'field';

import { distanceMeters } from './geo-math.js';

export const STOP_STATUSES: readonly StopStatus[] =
  ['draft', 'pending', 'verified', 'rejected', 'retired'];

export interface NewStop {
  code: string;
  nameEn: string;
  nameAr: string;
  lat: number;
  lng: number;
  source: StopSource;
}

/** WGS84 is bounded — a misplaced sign or a corrupted CSV must never persist
    "latitude 120". This is a hard rule, not a warning. */
export function isWithinBounds(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

const pad = (n: number) => String(n).padStart(3, '0');

/** A stable, human-usable public code (CH04 §4.1.2), e.g. ALX-SMO-014.
    `seq` is a monotonically increasing per-run number supplied by the caller
    (a real deployment derives it from the sequence in the repository). */
export function stopCode(city: string, zone: string, seq: number): string {
  const z = (zone || 'ZZZ').slice(0, 3).toUpperCase();
  return `${city.toUpperCase()}-${z}-${pad(Math.max(0, Math.floor(seq) % 1000))}`;
}

export function nextStopCode(city: string, zone: string, lastCode: string | null): string {
  const lastSeq = lastCode ? Number(lastCode.slice(-3)) || 0 : 0;
  return stopCode(city, zone, lastSeq + 1);
}

/** The duplicate guard (P2.2): a new stop within `minSpacingM` of an existing
    one is refused unless the caller supplies an explicit override reason. */
export interface SpacingCheck {
  ok: boolean;
  nearestId?: string;
  nearestDistanceM?: number;
}

export function spacingCheck(
  newLat: number, newLng: number,
  existing: ReadonlyArray<{ id: string; lat: number; lng: number }>,
  minSpacingM: number
): SpacingCheck {
  let nearest: { id: string; distanceM: number } | null = null;
  for (const s of existing) {
    const d = distanceMeters(newLat, newLng, s.lat, s.lng);
    if (!nearest || d < nearest.distanceM) nearest = { id: s.id, distanceM: d };
  }
  if (nearest && nearest.distanceM < minSpacingM) {
    return { ok: false, nearestId: nearest.id, nearestDistanceM: nearest.distanceM };
  }
  return { ok: true };
}

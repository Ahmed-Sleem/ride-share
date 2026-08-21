/* ══════════════════════════════════════════════════════════════════════
   Slot-grid generation (P3.2) — pure and testable. The operator publishes a
   window (e.g. 06:00–10:00) and an interval (e.g. every 15 min); the system
   generates the departure times. Grid only (T2) — free times produce
   07:03/07:07 and are unusable for riders and timetables. Wall-clock times
   (DEC-118). Regeneration is idempotent because the caller upserts on the
   unique (route, day, time) key.
   ══════════════════════════════════════════════════════════════════════ */

const pad = (n: number) => String(n).padStart(2, '0');

/** "HH:MM" from minutes since midnight. */
export function minutesToTime(min: number): string {
  const m = ((Math.floor(min) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function timeToMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return NaN;
  const h = Number(m[1]), mm = Number(m[2]);
  if (h > 23 || mm > 59) return NaN;
  return h * 60 + mm;
}

export type SlotGridResult =
  | { ok: true; times: string[] }
  | { ok: false; reason: 'bad_window' | 'bad_interval' };

/** Departure times in [windowStart, windowEnd) at `interval` minutes. The
    first departure is exactly windowStart; the last is strictly before
    windowEnd. */
export function generateSlotTimes(
  windowStart: string, windowEnd: string, intervalMin: number
): SlotGridResult {
  const start = timeToMinutes(windowStart);
  const end = timeToMinutes(windowEnd);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return { ok: false, reason: 'bad_window' };
  if (!Number.isInteger(intervalMin) || intervalMin < 5 || intervalMin > 120) return { ok: false, reason: 'bad_interval' };
  const times: string[] = [];
  for (let t = start; t < end; t += intervalMin) times.push(minutesToTime(t));
  return { ok: true, times };
}

/* ══════════════════════════════════════════════════════════════════════
   Route domain rules (P3.1) — pure and tested. Position integrity is the
   dangerous one: a route with positions 1,2,4 silently breaks "next stop".
   The service only ever APPENDS (position = count+1) or REORDERS via a
   permutation of the existing stop ids — an arbitrary gap can never be
   inserted.
   ══════════════════════════════════════════════════════════════════════ */

export type ReorderResult =
  | { ok: true; positions: Array<{ stopId: string; position: number }> }
  | { ok: false; reason: 'not_a_permutation' };

/** `orderedIds` must be EXACTLY the existing stop ids (same set), else the
    reorder is refused — no stop may be silently dropped or duplicated. */
export function reorderPositions(
  existingIds: string[], orderedIds: string[]
): ReorderResult {
  const a = [...existingIds].sort();
  const b = [...orderedIds].sort();
  if (a.length !== b.length || a.some((v, i) => v !== b[i])) {
    return { ok: false, reason: 'not_a_permutation' };
  }
  return {
    ok: true,
    positions: orderedIds.map((stopId, i) => ({ stopId, position: i + 1 })),
  };
}

/** Position of a stop appended to the END of a route. */
export function appendPosition(count: number): number {
  return count + 1;
}

/** True when the interval is a legal slot interval (CH19 SlotIntervalMinutes). */
export function isValidInterval(min: number): boolean {
  return Number.isInteger(min) && min >= 5 && min <= 120;
}

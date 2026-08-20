/* ══════════════════════════════════════════════════════════════════════
   Field-capture domain rules (P2.3). Pure and tested:
   - the accuracy gate: a fix worse than MaxFixAccuracy is refused, not warned
     (a 60 m fix recorded as truth is worse than no record);
   - the physical checklist: every answer is required — a partial submission
     is a refusal, because a stop you cannot stand at, lit, legally, and
     reachably is not a stop.
   ══════════════════════════════════════════════════════════════════════ */

export interface FieldChecklist {
  stand: boolean;
  lit: boolean;
  legal: boolean;
  reachable: boolean;
}

/** Every checklist question must be answered true before a capture is valid. */
export function checklistComplete(c: FieldChecklist): boolean {
  return c.stand === true && c.lit === true && c.legal === true && c.reachable === true;
}

export type AccuracyResult = { ok: true } | { ok: false; reason: 'inaccurate'; accuracyM: number };

/** A fix at or below `maxAccuracyM` is acceptable; anything worse is refused. */
export function accuracyGate(accuracyM: number, maxAccuracyM: number): AccuracyResult {
  if (!Number.isFinite(accuracyM) || accuracyM < 0 || accuracyM > maxAccuracyM) {
    return { ok: false, reason: 'inaccurate', accuracyM };
  }
  return { ok: true };
}

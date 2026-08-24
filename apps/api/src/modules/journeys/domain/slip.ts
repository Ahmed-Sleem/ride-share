/* Next-stop + schedule slip — pure (P3.9.2). Slip is minutes behind the
   published timetable. A pickup that would exceed MaxScheduleSlip is refused
   (comparison is strictly greater than the cap). */

export interface PlannedStop {
  stopId: string;
  position: number;
  runMinutes: number;
  nameEn: string;
  nameAr: string;
}

export function plannedArrival(departsAt: Date, runMinutes: number): Date {
  return new Date(departsAt.getTime() + Math.max(0, runMinutes) * 60_000);
}

/** Minutes behind timetable at `now`. Negative = early. */
export function slipMinutes(planned: Date, now: Date): number {
  return Math.round((now.getTime() - planned.getTime()) / 60_000);
}

export function exceedsMaxSlip(slip: number, maxSlip: number): boolean {
  return slip > maxSlip;
}

export function nextStopAfter(stops: PlannedStop[], arrivedIndex: number): PlannedStop | null {
  const ordered = [...stops].sort((a, b) => a.position - b.position);
  const next = ordered.find((s) => s.position > arrivedIndex);
  return next ?? null;
}

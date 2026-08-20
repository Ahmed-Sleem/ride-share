/* ══════════════════════════════════════════════════════════════════════
   Stop CSV parsing — pure and testable (P2.2 bulk import). Format:
     lat,lng,name_en[,name_ar]   one stop per line; an optional header line
     beginning with "lat" is skipped. Any malformed row fails the WHOLE import
     (all-or-nothing) — a partial corridor is worse than no corridor.
   ══════════════════════════════════════════════════════════════════════ */

export interface CsvStopRow {
  lat: number;
  lng: number;
  nameEn: string;
  nameAr: string;
}

export type CsvParseResult =
  | { ok: true; rows: CsvStopRow[] }
  | { ok: false; error: string; row: number };

export function parseStopsCsv(csv: string): CsvParseResult {
  const lines = csv.split(/\r?\n/);
  const rows: CsvStopRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!.trim();
    if (!raw) continue; // blank lines are fine
    const cells = raw.split(',').map((c) => c.trim());
    if (i === 0 && /^(lat(itude)?|"lat)/i.test(cells[0] ?? '')) continue; // header
    const rowNum = i + 1; // 1-based, matches what a spreadsheet shows
    if (cells.length < 3) return { ok: false, error: 'too_few_columns', row: rowNum };
    const lat = Number(cells[0]);
    const lng = Number(cells[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { ok: false, error: 'bad_coordinate', row: rowNum };
    }
    const nameEn = cells[2] ?? '';
    if (!nameEn) return { ok: false, error: 'missing_name', row: rowNum };
    rows.push({ lat, lng, nameEn, nameAr: cells[3] ?? '' });
  }
  if (!rows.length) return { ok: false, error: 'no_rows', row: 1 };
  return { ok: true, rows };
}

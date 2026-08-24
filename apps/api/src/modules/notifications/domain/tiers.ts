/* CH20 §20.0 — one place for tier + caps. Transactional is never suppressed. */

export type NotifyTier = 'transactional' | 'behavioural' | 'promotional';

export const TRANSACTIONAL_KINDS = new Set([
  'N-R02', 'N-R03', 'N-R04', 'N-R05', 'N-R06', 'N-R07', 'N-R08', 'N-R09',
  'N-R10', 'N-R11', 'N-R12', 'N-R13', 'N-R14', 'N-R15', 'N-R16', 'N-R17',
  'N-R18', 'N-R19', 'N-R20', 'N-R21',
  'N-D01', 'N-D02', 'N-D03', 'N-D04', 'N-D05', 'N-D06', 'N-D07', 'N-D08',
  'N-D09', 'N-D10', 'N-D11', 'N-D12', 'N-D13',
  'N-S01', 'N-S02', 'N-S03', 'N-S04', 'N-S05', 'N-S06', 'N-S07', 'N-S08',
  'N-S09', 'N-S10', 'N-S11',
  'journey.abort', 'booking.confirmed', 'booking.cancelled',
]);

export const BEHAVIOURAL_KINDS = new Set([
  'N-R30', 'N-R31', 'N-R32', 'N-R33', 'N-R34', 'N-R35',
  'N-D20', 'N-D21', 'N-D22', 'N-D23',
]);

export function tierOf(kind: string): NotifyTier {
  if (TRANSACTIONAL_KINDS.has(kind) || kind.startsWith('N-S') || kind.startsWith('N-R0') || kind.startsWith('N-R1') || kind.startsWith('N-D0')) {
    return 'transactional';
  }
  if (BEHAVIOURAL_KINDS.has(kind) || kind.startsWith('N-R3') || kind.startsWith('N-D2')) return 'behavioural';
  if (kind.startsWith('N-R4')) return 'promotional';
  return 'transactional';
}

export interface CapConfig {
  behaviouralMaxDay: number;
  behaviouralGapHours: number;
  promoMaxDay: number;
  promoMaxWeek: number;
  nonTxMaxDay: number;
}

export interface PriorSend {
  tier: NotifyTier;
  createdAt: Date;
}

export function allowsSend(tier: NotifyTier, now: Date, prior: PriorSend[], cfg: CapConfig): boolean {
  if (tier === 'transactional') return true;
  const dayAgo = now.getTime() - 24 * 3600_000;
  const weekAgo = now.getTime() - 7 * 24 * 3600_000;
  const nonTxToday = prior.filter((p) => p.tier !== 'transactional' && p.createdAt.getTime() >= dayAgo).length;
  if (nonTxToday >= cfg.nonTxMaxDay) return false;
  if (tier === 'behavioural') {
    const today = prior.filter((p) => p.tier === 'behavioural' && p.createdAt.getTime() >= dayAgo);
    if (today.length >= cfg.behaviouralMaxDay) return false;
    const last = prior.filter((p) => p.tier === 'behavioural').sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (last && now.getTime() - last.createdAt.getTime() < cfg.behaviouralGapHours * 3600_000) return false;
    return true;
  }
  const promoDay = prior.filter((p) => p.tier === 'promotional' && p.createdAt.getTime() >= dayAgo).length;
  const promoWeek = prior.filter((p) => p.tier === 'promotional' && p.createdAt.getTime() >= weekAgo).length;
  return promoDay < cfg.promoMaxDay && promoWeek < cfg.promoMaxWeek;
}

/** Lock-screen preview must not carry personal data (P7.5 TEST 4). */
export function sanitizePreview(text: string): string {
  const raw = String(text || '').trim();
  if (!raw) return 'Update';
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(raw)) return 'Update';
  if (/\+\d{8,}|\b01[0-9]{9}\b/.test(raw)) return 'Update';
  return raw.slice(0, 80);
}

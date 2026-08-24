/* Incident domain — the ONE place severity and legal transitions live (CH12 §12.2). */

export const INCIDENT_CATEGORIES = [
  'sos',
  'assault',
  'harassment',
  'dangerous_driving',
  'discrimination',
  'theft',
  'vehicle_condition',
  'punctuality',
  'other',
] as const;
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'severe';
export type IncidentStatus = 'OPEN' | 'TRIAGE' | 'INVESTIGATING' | 'DECIDED' | 'FOLLOWED_UP';
export type IncidentKind = 'sos' | 'report';

const SEVERE: ReadonlySet<IncidentCategory> = new Set([
  'assault', 'harassment', 'dangerous_driving', 'discrimination',
]);

export function isIncidentCategory(v: string): v is IncidentCategory {
  return (INCIDENT_CATEGORIES as readonly string[]).includes(v);
}

/** Auto severity from category (human may upgrade later). */
export function severityFor(category: IncidentCategory): IncidentSeverity {
  if (SEVERE.has(category)) return 'severe';
  if (category === 'sos' || category === 'theft') return 'high';
  if (category === 'vehicle_condition') return 'medium';
  return 'low';
}

export function recommendsPrecautionary(category: IncidentCategory): boolean {
  return SEVERE.has(category);
}

const LEGAL: Record<IncidentStatus, readonly IncidentStatus[]> = {
  OPEN: ['TRIAGE', 'INVESTIGATING'],
  TRIAGE: ['INVESTIGATING'],
  INVESTIGATING: ['DECIDED'],
  DECIDED: ['FOLLOWED_UP'],
  FOLLOWED_UP: [],
};

export function canTransitionIncident(from: IncidentStatus, to: IncidentStatus): boolean {
  return LEGAL[from].includes(to);
}

/** An incident cannot be closed or dismissed without a recorded decision. */
export function mayCloseWithoutDecision(status: IncidentStatus, hasDecision: boolean): boolean {
  if (status === 'DECIDED' || status === 'FOLLOWED_UP') return hasDecision;
  return false;
}

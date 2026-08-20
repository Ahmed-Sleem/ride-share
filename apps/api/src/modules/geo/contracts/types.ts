/* Geo contract — the only public surface of this module (CH8a §8a.2). */
import type { StopSource, StopStatus } from '../domain/stop.js';

export interface StopRow {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  lat: number;
  lng: number;
  status: StopStatus;
  source: StopSource;
  created_by: string | null;
  stand_ok: boolean | null;
  lit_ok: boolean | null;
  legal_stop_ok: boolean | null;
  reachable_ok: boolean | null;
  walking_to_next_m: number | null;
  override_reason: string | null;
  capture_id: string | null;
  gps_accuracy_m: number | null;
  created_at: Date;
}

export interface StopPhotoRow {
  id: string;
  stop_id: string;
  storage_key: string;
  mime_type: string;
  taken_at: Date | null;
  created_at: Date;
}

export interface StopVerificationRow {
  id: string;
  stop_id: string;
  verifier_id: string;
  decision: 'approved' | 'rejected';
  reason: string | null;
  device: string | null;
  gps_accuracy_m: number | null;
  created_at: Date;
}

/* Routes contract — the only public surface of this module (CH8a §8a.2). */
export type RouteStatus = 'draft' | 'published' | 'retired';
export type RouteDirection = 'outbound' | 'inbound';

export interface RouteRow {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  status: RouteStatus;
  direction: RouteDirection;
  fare_minor: number;
  window_start: string;
  window_end: string;
  slot_interval_min: number;
  created_by: string | null;
  created_at: Date;
}

export interface RouteStopRow {
  id: string;
  route_id: string;
  stop_id: string;
  position: number;
  distance_from_start_m: number;
  run_minutes: number;
  // joined for display + distance math
  stop_code?: string;
  stop_name_en?: string;
  stop_name_ar?: string;
  lat?: number;
  lng?: number;
}

export interface SlotRow {
  id: string;
  route_id: string;
  service_date: string;
  departs_at: string;
  required_vehicles: number;
  created_at: Date;
}

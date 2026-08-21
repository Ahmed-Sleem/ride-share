/* Journeys contract — the only public surface of this module (CH8a §8a.2). */
import type { JourneyStatus } from '../domain/journey.js';

export interface JourneyRow {
  id: string;
  route_id: string;
  slot_id: string;
  driver_user_id: string;
  vehicle_id: string | null;
  status: JourneyStatus;
  committed: boolean;
  seats_total: number;
  created_at: Date;
  // joined for display
  route_code?: string;
  route_name_en?: string;
  route_name_ar?: string;
  service_date?: string;
  departs_at?: string;
}

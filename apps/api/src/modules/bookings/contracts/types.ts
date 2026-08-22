/* Bookings contract — the only public surface of this module (CH8a §8a.2). */
import type { BookingStatus } from '../domain/booking.js';

export interface BookingRow {
  id: string;
  journey_id: string;
  rider_user_id: string;
  boarding_stop_id: string;
  seats: number;
  fare_minor: number;
  code: string;
  status: BookingStatus;
  created_at: Date;
  // joined for display
  route_name_en?: string;
  route_name_ar?: string;
  service_date?: string;
  departs_at?: string;
  stop_name_en?: string;
  stop_name_ar?: string;
}

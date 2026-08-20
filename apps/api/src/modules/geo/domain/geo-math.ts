/* ══════════════════════════════════════════════════════════════════════
   Geo math — the ONE place distance is computed (§0.3). DEC-197 chose numeric
   lat/lng columns (no PostGIS), so every "near me", spacing and gap rule calls
   this haversine — a corridor of stops is tiny compared to the earth, and
   haversine is accurate to well under a metre at city scale.
   ══════════════════════════════════════════════════════════════════════ */

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres between two WGS84 points. */
export function distanceMeters(
  lat1: number, lng1: number, lat2: number, lng2: number
): number {
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/** The lat/lng bounding box that contains every point within `radiusM` of
    (lat, lng) — the index-assisted pre-filter for a "stops near me" query.
    The padding (cosine of latitude) widens longitude near the poles. */
export function boundingBox(
  lat: number, lng: number, radiusM: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const dLat = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLng = dLat / Math.max(0.01, Math.cos(rad(lat)));
  return {
    minLat: lat - dLat, maxLat: lat + dLat,
    minLng: lng - dLng, maxLng: lng + dLng,
  };
}

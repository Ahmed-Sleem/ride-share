/* Geo contract — the ONLY public surface other modules may import (CH8a §8a.2).
   Re-exports the row types and the pure distance math so routes/matching can
   compute distances without reaching into geo's domain/ or infra/. */
export type { StopRow, StopPhotoRow, StopVerificationRow } from './types.js';
export { distanceMeters, boundingBox } from '../domain/geo-math.js';

/* Drivers contract — the ONLY public surface other modules may import
   (CH8a §8a.2). Journeys need to know whether a driver is approved and owns
   an approved vehicle; that check lives here, not in a copied rule. */
export { DriversService } from '../application/drivers.service.js';

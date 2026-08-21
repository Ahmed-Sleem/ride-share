/* Routes contract — the ONLY public surface other modules may import
   (CH8a §8a.2). Journeys needs the slot's route + departure instant; that
   read lives here, in routes' own repository. */
export { RoutesService } from '../application/routes.service.js';

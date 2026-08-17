-- Up Migration
-- 0001: baseline (no domain objects). PostGIS is DEFERRED per DEC-184 — the
-- launch platform runs Railway's managed PostgreSQL, which does not ship
-- PostGIS, and no geo feature exists yet (zero domain tables). Geo returns at
-- M2 via a PostGIS-capable host OR numeric lat/lng + OSRM/geocoder, decided
-- there. This migration keeps the up/down/up machinery proven.
SELECT 1;

-- Down Migration
SELECT 1;

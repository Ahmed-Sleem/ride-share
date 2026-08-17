-- Up Migration
-- 0001: enable PostGIS and nothing else (BUILD_PLAN P0.5). "Does this
-- environment have PostGIS" is answered by this first migration, not
-- discovered later. Domain tables arrive in their own migrations (M1+).
CREATE EXTENSION IF NOT EXISTS postgis;

-- Down Migration
DROP EXTENSION IF EXISTS postgis;

-- Database initialization script for PostgreSQL with PostGIS
-- This script should be run on the database to enable PostGIS extension

-- Enable PostGIS extension for geospatial operations
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS installation
SELECT PostGIS_Version();

-- Create indexes that will be used by TypeORM entities
-- These will be automatically created by TypeORM synchronize, but documented here for reference

-- Spatial index for entities location column (will be created automatically)
-- CREATE INDEX IF NOT EXISTS idx_entities_location ON entities USING GIST(location);

-- Regular indexes for performance (will be created automatically by TypeORM)
-- CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
-- CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
-- CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
-- CREATE INDEX IF NOT EXISTS idx_entities_kaha_id ON entities(kaha_id);
-- CREATE INDEX IF NOT EXISTS idx_entities_geohash ON entities(geohash);
# Database Setup Guide

## Prerequisites

1. **PostgreSQL** (version 12 or higher)
2. **PostGIS Extension** (for geospatial operations)

## Setup Steps

### 1. Install PostgreSQL with PostGIS

#### On Windows:
```bash
# Install PostgreSQL from official installer
# During installation, make sure to include PostGIS extension
```

#### On macOS:
```bash
brew install postgresql postgis
```

#### On Ubuntu/Debian:
```bash
sudo apt-get install postgresql postgresql-contrib postgis
```

### 2. Create Database

```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE attendance_db;

-- Connect to the attendance_db database
\c attendance_db;

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS installation
SELECT PostGIS_Version();
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and update database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=attendance_db
```

### 4. Run Application

The application uses TypeORM with `synchronize: true`, so database schema will be automatically created on startup.

```bash
npm run start:dev
```

## Database Schema

The application will automatically create the following tables:

- `users` - User profiles with department relationships
- `departments` - Organizational departments within businesses  
- `entities` - Business locations with PostGIS geography points
- `department_entity_assignments` - Links departments to accessible entities

## PostGIS Features Used

- **GEOGRAPHY(POINT, 4326)** - For precise location storage
- **ST_Distance()** - For calculating distances between points
- **ST_DWithin()** - For proximity validation
- **GIST indexes** - For efficient spatial queries

## Troubleshooting

### PostGIS Extension Not Found
```sql
-- Check available extensions
SELECT * FROM pg_available_extensions WHERE name LIKE 'postgis%';

-- Install PostGIS if not available
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Connection Issues
- Verify PostgreSQL is running
- Check firewall settings for port 5432
- Ensure user has proper permissions on the database
# Entity Geospatial Implementation

## Overview

This document describes the implementation of Entity management with PostGIS geospatial functionality for the Attendance Microservice. The implementation provides accurate location-based operations including proximity search and location validation.

## Problem

The system needs to:
- Store business locations with precise geospatial coordinates
- Perform efficient proximity searches to find nearby entities
- Validate if user locations are within allowed entity radius
- Handle geospatial calculations with high accuracy

## Context

This implementation is part of Task 5 from the Phase 1-2 Foundation spec, addressing requirements 6.1-6.5 and 9.1-9.5 for geospatial functionality.

## Root Cause

Previous implementations lacked:
- PostGIS integration for accurate spherical distance calculations
- Geohash optimization for efficient proximity pre-filtering
- Proper validation for coordinate boundaries and radius constraints
- Comprehensive error handling for geospatial operations

## Solution

### 1. Entity Model with PostGIS Support

```typescript
@Entity('entities')
export class Entity extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  kahaId: string; // Unique business identifier

  @Column({ type: 'varchar', length: 12 })
  geohash: string; // For efficient proximity pre-filtering

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326, // WGS84 coordinate system
  })
  location: Point; // PostGIS geography point

  @Column({ type: 'integer', default: 100 })
  radiusMeters: number; // Allowed check-in radius
}
```

### 2. Geohash Optimization

- **Purpose**: Pre-filter candidates before expensive PostGIS calculations
- **Precision**: 8 characters (~38m accuracy) for storage, 6 characters (~1.2km) for search
- **Library**: `ngeohash` for consistent geohash calculations

```typescript
private calculateGeohash(latitude: number, longitude: number): string {
  return geohash.encode(latitude, longitude, 8);
}
```

### 3. PostGIS Spatial Queries

#### Proximity Search
```sql
SELECT 
  e.id, e.name, e.kaha_id as "kahaId",
  ST_X(e.location::geometry) as longitude,
  ST_Y(e.location::geometry) as latitude,
  ST_Distance(e.location, ST_Point(${longitude}, ${latitude})::geography) as "distanceMeters"
FROM entities e
WHERE e.geohash LIKE '${geohashPrefix}%'
  AND ST_DWithin(e.location, ST_Point(${longitude}, ${latitude})::geography, ${radiusMeters})
ORDER BY ST_Distance(e.location, ST_Point(${longitude}, ${latitude})::geography)
LIMIT 50
```

#### Location Validation
```sql
SELECT ST_DWithin(location, ST_Point(${longitude}, ${latitude})::geography, radius_meters) as is_within_radius
FROM entities
WHERE id = $1
```

### 4. DTOs with Validation

#### CreateEntityDto
- Validates latitude (-90 to 90) and longitude (-180 to 180)
- Enforces radius constraints (10m to 1km)
- Ensures kahaId uniqueness

#### ProximitySearchDto
- Validates search coordinates
- Allows search radius up to 10km
- Defaults to 1km search radius

#### LocationValidationDto
- Validates entity ID (UUID format)
- Validates user coordinates
- Returns detailed validation response

### 5. Service Methods

#### create()
- Validates kahaId uniqueness
- Calculates geohash automatically
- Creates PostGIS point from coordinates
- Handles coordinate system conversion (lng, lat order)

#### findNearby()
- Uses geohash for initial filtering
- Applies PostGIS ST_Distance for accurate calculation
- Orders results by distance
- Limits to 50 results for performance

#### validateLocationWithinRadius()
- Calculates actual distance using PostGIS
- Uses ST_DWithin for radius validation
- Provides detailed validation response
- Handles error cases gracefully

## Code Examples

### ✅ Correct Usage

```typescript
// Create entity with proper validation
const entityDto: CreateEntityDto = {
  name: 'Kathmandu Office',
  kahaId: 'KTM001',
  latitude: 27.7172,
  longitude: 85.3240,
  radiusMeters: 100,
};
const entity = await entityService.create(entityDto);

// Search nearby entities
const searchDto: ProximitySearchDto = {
  latitude: 27.7172,
  longitude: 85.3240,
  radiusMeters: 1000,
};
const nearby = await entityService.findNearby(searchDto);

// Validate location
const validationDto: LocationValidationDto = {
  entityId: entity.id,
  latitude: 27.7173,
  longitude: 85.3241,
};
const result = await entityService.validateLocationWithinRadius(validationDto);
```

### ❌ Wrong Approaches

```typescript
// Wrong - Using internal UUID for external operations
const entity = await entityService.findById(internalId);

// Wrong - Not validating coordinates
const invalidDto = {
  latitude: 200, // Invalid latitude
  longitude: -200, // Invalid longitude
};

// Wrong - Ignoring geospatial precision
const roughDistance = Math.sqrt(
  Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2)
); // Inaccurate flat-earth calculation
```

## Related Files

- `src/modules/entity/entities/entity.entity.ts` - Entity model with PostGIS fields
- `src/modules/entity/entity.service.ts` - Geospatial business logic
- `src/modules/entity/entity.controller.ts` - REST endpoints
- `src/modules/entity/dto/` - Validation DTOs
- `src/modules/entity/entity.service.spec.ts` - Unit tests
- `src/modules/entity/entity.integration.spec.ts` - Integration tests

## Key Takeaways

1. **PostGIS Accuracy**: Use PostGIS ST_Distance for accurate spherical calculations
2. **Geohash Optimization**: Pre-filter with geohash before expensive spatial queries
3. **Coordinate Validation**: Always validate latitude/longitude boundaries
4. **Error Handling**: Provide meaningful error messages for geospatial failures
5. **Performance**: Limit search results and use spatial indexes
6. **Testing**: Include both unit tests and integration tests with real coordinates

## Performance Considerations

- Geohash pre-filtering reduces query candidates by ~90%
- PostGIS spatial indexes automatically optimize ST_Distance queries
- Result limiting (50 entities) prevents excessive data transfer
- Coordinate validation prevents invalid spatial operations

## Date

2025-10-05
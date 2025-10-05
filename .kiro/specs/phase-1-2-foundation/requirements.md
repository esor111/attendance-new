# Requirements Document - Phase 1 & 2 Foundation

## Introduction

This specification covers the foundational modules for the Attendance Microservice, including User Management, Entity (Business Location) Management, and Department-Entity Relationships. The system follows a handshake process where user and business data is populated from external microservices during login/business switch operations, rather than being created directly through APIs.

The core philosophy is to build exactly what's needed with no over-engineering, using NestJS + TypeScript with PostgreSQL and PostGIS for geospatial functionality.

## Requirements

### Requirement 1: User Data Handshake Process

**User Story:** As a system, I want to automatically populate user data from external microservices during login, so that local user records are available for attendance operations without manual user creation.

#### Acceptance Criteria

1. WHEN a user logs in with userId THEN the system SHALL check if user exists locally
2. IF user does not exist locally THEN the system SHALL fetch user data from User Microservice
3. WHEN user data is fetched from external service THEN the system SHALL save it locally with lastSyncedAt timestamp
4. IF user already exists locally THEN the system SHALL use existing local data without external API call
5. WHEN user data is saved locally THEN the system SHALL generate internal UUID while preserving external userId

### Requirement 2: Business Data Handshake Process

**User Story:** As a system, I want to automatically populate business data from external microservices during business switch operations, so that local business records are available for attendance operations.

#### Acceptance Criteria

1. WHEN a user switches business with businessId THEN the system SHALL check if business exists locally
2. IF business does not exist locally THEN the system SHALL fetch business data from Business Microservice
3. WHEN business data is fetched from external service THEN the system SHALL save it locally with lastSyncedAt timestamp
4. IF business already exists locally THEN the system SHALL use existing local data without external API call
5. WHEN business data is saved locally THEN the system SHALL generate internal UUID while preserving external businessId

### Requirement 3: Department Management

**User Story:** As a system admin, I want to manage departments within businesses, so that users can be organized by organizational structure.

#### Acceptance Criteria

1. WHEN creating a department THEN the system SHALL require name and businessId
2. WHEN creating a department THEN the system SHALL validate name is unique within the business
3. WHEN creating a department THEN the system SHALL extend BaseEntity with proper UUID generation
4. WHEN retrieving departments THEN the system SHALL include business relationship data
5. WHEN deleting a department THEN the system SHALL handle user reassignments gracefully

### Requirement 4: User Profile Management

**User Story:** As a user, I want to view and update my profile information, so that my attendance records are associated with correct personal details.

#### Acceptance Criteria

1. WHEN retrieving user profile THEN the system SHALL return user data with department relationship
2. WHEN updating user profile THEN the system SHALL validate email uniqueness across the business
3. WHEN updating user profile THEN the system SHALL validate phone uniqueness across the business
4. WHEN updating user isFieldWorker status THEN the system SHALL preserve historical attendance data
5. WHEN user is assigned to department THEN the system SHALL validate department exists and belongs to same business

### Requirement 5: Entity (Business Location) Creation

**User Story:** As a system admin, I want to register business locations with precise GPS coordinates, so that they can be used for location-based attendance validation.

#### Acceptance Criteria

1. WHEN creating an entity THEN the system SHALL require name, kahaId, latitude, longitude, and radiusMeters
2. WHEN creating an entity THEN the system SHALL validate kahaId is unique across all entities
3. WHEN creating an entity THEN the system SHALL calculate geohash from coordinates automatically
4. WHEN creating an entity THEN the system SHALL store location as PostGIS GEOGRAPHY(POINT, 4326)
5. WHEN creating an entity THEN the system SHALL validate radiusMeters is between 10 and 1000 meters
6. WHEN creating an entity THEN the system SHALL validate latitude is between -90 and 90
7. WHEN creating an entity THEN the system SHALL validate longitude is between -180 and 180

### Requirement 6: Geospatial Proximity Search

**User Story:** As a field worker, I want to find nearby business entities, so that I know where I can perform valid check-ins.

#### Acceptance Criteria

1. WHEN searching for nearby entities THEN the system SHALL use PostGIS distance calculations
2. WHEN searching for nearby entities THEN the system SHALL accept latitude, longitude, and search radius parameters
3. WHEN searching for nearby entities THEN the system SHALL return entities within search radius ordered by distance
4. WHEN searching for nearby entities THEN the system SHALL include distance in meters for each result
5. WHEN searching for nearby entities THEN the system SHALL use geohash for efficient initial filtering

### Requirement 7: Department-Entity Assignment Management

**User Story:** As a system admin, I want to assign entities to departments, so that employees can only check in at authorized locations based on their department.

#### Acceptance Criteria

1. WHEN assigning entity to department THEN the system SHALL validate both department and entity exist
2. WHEN assigning entity to department THEN the system SHALL prevent duplicate assignments
3. WHEN marking entity as primary for department THEN the system SHALL ensure only one primary entity per department
4. WHEN marking entity as primary THEN the system SHALL automatically unmark previous primary entity
5. WHEN retrieving department entities THEN the system SHALL clearly indicate which is primary

### Requirement 8: Entity Access Control

**User Story:** As the system, I want to determine which entities a user can access based on their department assignments, so that attendance operations are restricted to authorized locations.

#### Acceptance Criteria

1. WHEN user attempts attendance operation THEN the system SHALL check user's department entity assignments
2. WHEN user has no department THEN the system SHALL deny access to all entities
3. WHEN user's department has no entity assignments THEN the system SHALL deny access to all entities
4. WHEN user's department has entity assignments THEN the system SHALL allow access only to assigned entities
5. WHEN retrieving user's accessible entities THEN the system SHALL return entities with primary/secondary designation

### Requirement 9: Location Validation

**User Story:** As the system, I want to validate that check-in attempts are within the allowed radius of assigned entities, so that attendance records are geographically accurate.

#### Acceptance Criteria

1. WHEN validating location THEN the system SHALL calculate distance using PostGIS ST_Distance function
2. WHEN user location is within entity radius THEN the system SHALL mark validation as successful
3. WHEN user location is outside entity radius THEN the system SHALL reject the check-in attempt
4. WHEN calculating distance THEN the system SHALL use spherical distance calculation for accuracy
5. WHEN validation fails THEN the system SHALL return specific error message with distance and required radius

### Requirement 10: Data Integrity and Relationships

**User Story:** As the system, I want to maintain proper data relationships and integrity, so that the attendance system operates reliably.

#### Acceptance Criteria

1. WHEN user is deleted THEN the system SHALL preserve historical attendance records
2. WHEN department is deleted THEN the system SHALL handle user reassignments gracefully
3. WHEN entity is deleted THEN the system SHALL preserve historical attendance records with entity reference
4. WHEN business data is updated externally THEN the system SHALL maintain local data consistency
5. WHEN foreign key constraints are violated THEN the system SHALL return appropriate error messages
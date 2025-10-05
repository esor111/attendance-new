# Implementation Plan - Phase 1 & 2 Foundation

- [x] 1. Setup project foundation and BaseEntity pattern





  - Create BaseEntity with UUID, timestamps, and proper TypeORM decorators
  - Configure TypeORM with PostGIS extension and synchronize: true
  - Setup NestJS modules structure for User, Entity, Department
  - _Requirements: 10.1, 10.5_

- [ ] 2. Implement User and Department entities with relationships






  - Create User entity extending BaseEntity with all required fields
  - Create Department entity with business relationship
  - Implement proper foreign key relationships and constraints
  - Add validation decorators for email, phone uniqueness
  - _Requirements: 4.1, 4.2, 4.3, 3.1, 3.2, 3.3_

- [x] 3. Build handshake service for external data population


  - Create HandshakeService with methods to fetch from external APIs
  - Implement user existence check and external fetch logic
  - Implement business existence check and external fetch logic
  - Add lastSyncedAt timestamp handling for data freshness
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 4. Create Entity management with PostGIS geospatial functionality
  - Create Entity entity with PostGIS GEOGRAPHY(POINT, 4326) location field
  - Implement geohash calculation and storage
  - Add validation for coordinates, radius, and kahaId uniqueness
  - Create repository methods for spatial queries using PostGIS functions
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [-] 5.   Create Entity management with PostGIS geospatial functionality & Implement geospatial proximity search and validation



- Create Entity entity with PostGIS GEOGRAPHY(POINT, 4326) location field
  - Implement geohash calculation and storage
  - Add validation for coordinates, radius, and kahaId uniqueness
  - Create repository methods for spatial queries using PostGIS functions
  - Build nearby entities search using ST_Distance and geohash filtering
  - Implement location validation within entity radius using ST_DWithin
  - Create DTOs for proximity search requests and responses
  - Add distance calculation and ordering for search results
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [-] 6. Build Department-Entity assignment system



  - Create DepartmentEntityAssignment entity with unique constraints
  - Implement primary entity logic (only one primary per department)
  - Add assignment validation and duplicate prevention
  - Create methods to retrieve user's accessible entities based on department
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 7. Create REST API controllers and DTOs




  - Build User controller with profile retrieval and update endpoints
  - Build Entity controller with creation, search, and validation endpoints
  - Build Department controller with CRUD and entity assignment endpoints
  - Create comprehensive DTOs with proper validation decorators
  - _Requirements: 4.1, 4.4, 4.5, 5.1, 6.1, 7.1_

- [ ] 8. Implement error handling and data integrity
  - Add global exception filter for consistent error responses
  - Implement proper cascade delete and foreign key constraint handling
  - Add validation for all business rules and constraints
  - Create error messages for location validation failures
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 9.5_

- [ ] 9. Add comprehensive testing and validation
  - Write unit tests for all service methods and business logic
  - Create integration tests for handshake process and external API calls
  - Test geospatial calculations and PostGIS spatial queries
  - Validate all error scenarios and edge cases
  - _Requirements: All requirements validation_
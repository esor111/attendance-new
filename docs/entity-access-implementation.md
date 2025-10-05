# Entity Access Resolution Implementation

## Overview

This document describes the implementation of Task 2: "Implement entity access resolution and user assignment services" from the attendance core features specification.

## Implementation Summary

### Components Created

1. **EntityAccessService** (`src/modules/attendance/services/entity-access.service.ts`)
   - Main service for resolving authorized entities for users
   - Implements priority logic: user-specific assignments override department assignments
   - Provides methods for entity access validation and management

2. **EntityAccessController** (`src/modules/attendance/controllers/entity-access.controller.ts`)
   - REST API endpoints for managing user entity assignments
   - Provides CRUD operations for user-specific entity assignments

3. **DTOs** (`src/modules/attendance/dto/`)
   - `CreateUserEntityAssignmentDto` - For creating new assignments
   - `UpdateUserEntityAssignmentDto` - For updating existing assignments
   - `EntityAccessResponseDto` - Response format for entity access operations

4. **Tests**
   - Unit tests: `entity-access.service.spec.ts`
   - Integration tests: `entity-access.integration.spec.ts`

### Key Features Implemented

#### 1. Entity Access Resolution (Requirements 5.3, 5.4)
- **Priority Logic**: User-specific assignments take precedence over department assignments
- **Combined Access**: Users get access to both user-specific and department entities
- **Efficient Querying**: Uses optimized database queries to resolve entity access

```typescript
// Example: Get all authorized entities for a user
const entities = await entityAccessService.getAuthorizedEntities(userId);
```

#### 2. Primary Entity Management (Requirements 5.2, 5.6)
- **Single Primary**: Only one entity can be marked as primary per user
- **Automatic Management**: Setting a new primary automatically clears the previous one
- **Fallback Logic**: If no user-specific primary exists, falls back to department primary

```typescript
// Example: Set primary entity for a user
await entityAccessService.setPrimaryEntity(userId, entityId);
```

#### 3. Entity Access Validation (Requirements 5.4, 5.5)
- **Access Checking**: Validates if user has access to specific entities
- **Error Handling**: Provides meaningful error messages for access violations
- **Validation Methods**: Both boolean checks and exception-throwing validation

```typescript
// Example: Check entity access
const hasAccess = await entityAccessService.hasEntityAccess(userId, entityId);

// Example: Validate with exception on failure
const entity = await entityAccessService.validateEntityAccess(userId, entityId);
```

#### 4. User Entity Assignment Management (Requirements 5.1, 5.2, 5.6)
- **CRUD Operations**: Create, read, update, delete user entity assignments
- **Unique Constraints**: Prevents duplicate assignments for same user-entity pair
- **Primary Designation**: Supports marking entities as primary for users

```typescript
// Example: Create user entity assignment
const assignment = await entityAccessService.createUserEntityAssignment(
  userId, 
  entityId, 
  isPrimary
);
```

### API Endpoints

The EntityAccessController provides the following REST endpoints:

- `GET /api/attendance/entity-access/users/:userId/entities` - Get authorized entities
- `GET /api/attendance/entity-access/users/:userId/primary-entity` - Get primary entity
- `GET /api/attendance/entity-access/users/:userId/assignments` - Get detailed assignments
- `GET /api/attendance/entity-access/users/:userId/entities/:entityId/access` - Check access
- `POST /api/attendance/entity-access/assignments` - Create assignment
- `PUT /api/attendance/entity-access/users/:userId/entities/:entityId` - Update assignment
- `PUT /api/attendance/entity-access/users/:userId/primary-entity/:entityId` - Set primary
- `DELETE /api/attendance/entity-access/users/:userId/entities/:entityId` - Remove assignment

### Database Integration

The service integrates with existing entities:
- **UserEntityAssignment**: Already existed, used for user-specific assignments
- **DepartmentEntityAssignment**: Used for department-based assignments
- **User**: User information and department relationships
- **Entity**: Business location entities

### Priority Logic Implementation

The service implements the following priority logic:

1. **User-Specific First**: Check for direct user entity assignments
2. **Department Fallback**: If no user-specific assignment, check department assignments
3. **Combined Results**: Merge both types of assignments, with user-specific taking precedence
4. **Primary Entity Resolution**: User-specific primary overrides department primary

### Error Handling

The service provides comprehensive error handling:
- **NotFoundException**: When users, entities, or assignments don't exist
- **Validation Errors**: For invalid data or business rule violations
- **Duplicate Prevention**: Prevents creating duplicate assignments
- **Access Violations**: Clear messages when users lack entity access

### Testing Coverage

#### Unit Tests
- Service method functionality
- Priority logic validation
- Error handling scenarios
- Mock-based testing for isolation

#### Integration Tests
- Database integration
- Real entity relationships
- End-to-end workflows
- Data consistency validation

## Requirements Fulfilled

✅ **5.1**: User-specific entity assignments with multiple entities support
✅ **5.2**: Primary entity designation with unique constraints
✅ **5.3**: Priority logic - user assignments override department assignments
✅ **5.4**: Combined user and department entity assignments
✅ **5.5**: Entity access validation with proper error handling
✅ **5.6**: Repository methods for user entity assignments with CRUD operations

## Integration with Attendance Module

The EntityAccessService is properly integrated into the attendance module:
- Added to module providers and exports
- Available for injection in other attendance services
- Controller registered for API endpoints
- All dependencies properly configured

## Next Steps

This implementation provides the foundation for:
1. **Geospatial Service**: Can use entity access resolution for location validation
2. **Attendance Service**: Can validate user access to entities during clock-in/out
3. **Reporting Service**: Can filter data based on user's authorized entities
4. **Field Worker Services**: Can validate location access for client visits

The service is ready for use in subsequent tasks of the attendance core features implementation.
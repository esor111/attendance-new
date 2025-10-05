# Error Handling and Data Integrity Implementation

## Overview

This document describes the comprehensive error handling and data integrity system implemented for the Attendance Microservice. The system provides consistent error responses, proper validation, and robust data integrity enforcement.

## Implementation Date
2025-10-05

## Requirements Addressed
- **10.1**: Data integrity and relationships
- **10.2**: Proper cascade delete and foreign key constraint handling  
- **10.3**: Validation for all business rules and constraints
- **10.4**: Error messages for location validation failures
- **10.5**: Consistent error response format
- **9.5**: Location validation error messages

## Components Implemented

### 1. Global Exception Filter (`src/common/filters/global-exception.filter.ts`)

**Purpose**: Provides consistent error responses across all endpoints

**Features**:
- Handles HTTP exceptions with detailed error messages
- Processes database constraint violations with meaningful messages
- Converts TypeORM errors to user-friendly responses
- Logs errors for debugging while protecting sensitive information
- Standardized error response format

**Error Response Format**:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email must be a valid email address",
      "value": "invalid-email"
    }
  ],
  "timestamp": "2025-10-05T10:30:00.000Z",
  "path": "/api/users/123/profile",
  "method": "PUT"
}
```

### 2. Custom Business Logic Exceptions (`src/common/exceptions/business-logic.exceptions.ts`)

**Purpose**: Specific exception types for business rule violations

**Exception Types**:
- `LocationValidationException`: For geospatial validation failures
- `EntityAccessDeniedException`: For access control violations
- `DepartmentAssignmentException`: For department-entity assignment errors
- `ExternalServiceException`: For external microservice failures
- `DataIntegrityException`: For general data integrity violations
- `GeospatialValidationException`: For coordinate validation errors

### 3. Enhanced Validation Pipes (`src/common/pipes/validation.pipe.ts`)

**Purpose**: Advanced validation with detailed error reporting

**Features**:
- Enhanced validation pipe with comprehensive error messages
- Coordinate validation pipe for geospatial data
- Automatic type transformation and whitelist validation
- Detailed field-level error reporting

### 4. Validation Service (`src/common/services/validation.service.ts`)

**Purpose**: Centralized business rule validation

**Validation Methods**:
- `validateCoordinates()`: Geographic coordinate validation
- `validateRadius()`: Entity radius validation
- `validateLocationWithinRadius()`: Proximity validation
- `validateEmail()`: Email format validation
- `validatePhoneNumber()`: Phone number validation
- `validateDepartmentName()`: Department name validation
- `validateKahaId()`: KahaId format and uniqueness validation
- `validateUUID()`: UUID format validation
- `validatePrimaryEntityAssignment()`: Primary entity rules validation

### 5. Swagger/OpenAPI Documentation

**Purpose**: Comprehensive API documentation with error examples

**Features**:
- Complete API documentation with examples
- Error response schemas for all endpoints
- Validation rule documentation
- Interactive API testing interface
- Authentication documentation structure

**Access**: `http://localhost:3000/api/docs`

### 6. Entity Relationship and Cascade Handling

**Purpose**: Proper data integrity and cascade delete behavior

**Implementation**:
- **User-Department Relationship**: `onDelete: 'SET NULL'` - Preserves users when department is deleted
- **Department-EntityAssignment**: `cascade: ['remove']` - Removes assignments when department is deleted
- **Entity-EntityAssignment**: `cascade: ['remove']` - Removes assignments when entity is deleted
- **Unique Constraints**: Prevents duplicate assignments and enforces business rules

## Database Constraint Handling

### Unique Constraint Violations
- **Email/Phone Uniqueness**: "Email address is already in use"
- **KahaId Uniqueness**: "KahaId is already in use"
- **Department Name**: "Department name already exists in this business"
- **Entity Assignment**: "Entity is already assigned to this department"

### Foreign Key Constraint Violations
- **Department Reference**: "Referenced department does not exist"
- **Entity Reference**: "Referenced entity does not exist"

### Check Constraint Violations
- **Coordinate Validation**: "Latitude must be between -90 and 90 degrees"
- **Radius Validation**: "Radius must be between 10 and 1000 meters"

## Location Validation Error Messages

### Successful Validation
```json
{
  "isValid": true,
  "distanceMeters": 85.5,
  "allowedRadiusMeters": 100,
  "entityName": "Main Office Kathmandu",
  "message": "Location is within allowed radius"
}
```

### Failed Validation
```json
{
  "statusCode": 400,
  "message": "Location validation failed. You are 150.50m away from Main Office Kathmandu, but must be within 100m radius.",
  "error": "Location Validation Failed",
  "details": {
    "actualDistance": 150.5,
    "requiredRadius": 100,
    "entityName": "Main Office Kathmandu"
  }
}
```

## API Documentation Examples

### Entity Creation with Validation
```typescript
@ApiOperation({
  summary: 'Create new business location',
  description: 'Creates a new entity with geospatial coordinates and validation.',
})
@ApiResponse({
  status: 201,
  description: 'Entity created successfully',
  type: EntityResponseDto,
})
@ApiBadRequestResponse({
  description: 'Validation failed - invalid coordinates or radius',
})
@ApiConflictResponse({
  description: 'KahaId already exists',
})
```

### User Profile Update with Validation
```typescript
@ApiOperation({
  summary: 'Update user profile',
  description: 'Updates user profile with validation for email/phone uniqueness.',
})
@ApiBody({
  type: UpdateUserProfileDto,
  description: 'User profile update data',
})
@ApiConflictResponse({
  description: 'Email or phone already in use',
})
```

## Testing Strategy

### Unit Tests
- Validation service methods with various input scenarios
- Custom exception creation and message formatting
- Coordinate validation edge cases
- Business rule validation logic

### Integration Tests
- Complete error handling pipeline testing
- Database constraint violation handling
- API endpoint error response validation
- Swagger documentation accuracy

## Configuration

### Main Application Setup (`src/main.ts`)
```typescript
// Global validation pipe
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
}));

// Global exception filter
app.useGlobalFilters(new GlobalExceptionFilter());

// Swagger configuration
const config = new DocumentBuilder()
  .setTitle('Attendance Microservice API')
  .setDescription('Comprehensive API with error handling...')
  .setVersion('1.0')
  .build();
```

### App Module Configuration (`src/app.module.ts`)
```typescript
providers: [
  ValidationService,
  {
    provide: APP_FILTER,
    useClass: GlobalExceptionFilter,
  },
  {
    provide: APP_PIPE,
    useClass: EnhancedValidationPipe,
  },
],
```

## Key Benefits

1. **Consistent Error Responses**: All endpoints return standardized error formats
2. **Detailed Validation Messages**: Field-level validation with specific error messages
3. **Business Rule Enforcement**: Centralized validation for complex business logic
4. **Database Integrity**: Proper cascade handling and constraint management
5. **Developer Experience**: Comprehensive API documentation with examples
6. **Debugging Support**: Detailed error logging without exposing sensitive data
7. **Location Validation**: Specific error messages for geospatial validation failures

## Usage Examples

### Handling Validation Errors in Controllers
```typescript
@Post()
async create(@Body(ValidationPipe) createDto: CreateEntityDto) {
  // Validation happens automatically
  // Errors are handled by GlobalExceptionFilter
  return this.entityService.create(createDto);
}
```

### Custom Business Logic Validation
```typescript
async validateLocationAccess(userId: string, entityId: string) {
  const user = await this.findUser(userId);
  if (!user.department) {
    throw new EntityAccessDeniedException(
      userId, 
      entityId, 
      'User has no department assigned'
    );
  }
}
```

### Location Validation with Detailed Errors
```typescript
async validateLocation(dto: LocationValidationDto) {
  const distance = this.calculateDistance(dto.latitude, dto.longitude, entity.location);
  
  if (distance > entity.radiusMeters) {
    throw new LocationValidationException(
      distance,
      entity.radiusMeters,
      entity.name
    );
  }
}
```

## Conclusion

The error handling and data integrity system provides a robust foundation for the Attendance Microservice. It ensures consistent error responses, proper validation, and maintains data integrity while providing excellent developer experience through comprehensive documentation and clear error messages.

All requirements (10.1, 10.2, 10.3, 10.4, 10.5, 9.5) have been successfully implemented with proper testing and documentation.
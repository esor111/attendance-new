import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standard Error Response DTO for API documentation
 * Provides consistent error response structure across all endpoints
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Validation failed',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Detailed validation errors',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        field: { type: 'string', example: 'email' },
        message: { type: 'string', example: 'Email must be a valid email address' },
        value: { type: 'string', example: 'invalid-email' },
      },
    },
  })
  errors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;

  @ApiProperty({
    description: 'Timestamp of the error',
    example: '2025-10-05T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path that caused the error',
    example: '/api/users/123/profile',
  })
  path: string;

  @ApiProperty({
    description: 'HTTP method used',
    example: 'PUT',
  })
  method: string;
}

/**
 * Location Validation Error Response DTO
 * Specific error response for geospatial validation failures
 */
export class LocationValidationErrorDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Location validation error details',
    type: 'object',
    properties: {
      actualDistance: { type: 'number', example: 150.25 },
      requiredRadius: { type: 'number', example: 100 },
      entityName: { type: 'string', example: 'Main Office' },
    },
  })
  details: {
    actualDistance: number;
    requiredRadius: number;
    entityName: string;
  };
}

/**
 * Entity Access Denied Error Response DTO
 * Specific error response for access control violations
 */
export class EntityAccessDeniedErrorDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Access denial details',
    type: 'object',
    properties: {
      userId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
      entityId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
      reason: { type: 'string', example: 'User has no department assigned' },
    },
  })
  details: {
    userId: string;
    entityId: string;
    reason: string;
  };
}
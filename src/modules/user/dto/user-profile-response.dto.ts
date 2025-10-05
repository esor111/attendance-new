import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for user profile response
 * Includes user data with department relationship
 * Requirements: 4.1
 */
export class UserProfileResponseDto {
  @ApiProperty({
    description: 'Internal user UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+977-9841234567',
  })
  phone: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'User physical address',
    example: 'Kathmandu, Nepal',
  })
  address?: string;

  @ApiPropertyOptional({
    description: 'External user ID from User Microservice',
    example: 'ext-user-123',
  })
  userId?: string;

  @ApiProperty({
    description: 'Whether the user is a field worker',
    example: true,
  })
  isFieldWorker: boolean;

  @ApiPropertyOptional({
    description: 'Department ID the user belongs to',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Last sync timestamp with external service',
    example: '2025-10-05T10:30:00.000Z',
  })
  lastSyncedAt?: Date;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2025-10-05T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User last update timestamp',
    example: '2025-10-05T10:30:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Department information if user is assigned to one',
    type: 'object',
    properties: {
      id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
      name: { type: 'string', example: 'Human Resources' },
      businessId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174002' },
    },
  })
  department?: {
    id: string;
    name: string;
    businessId: string;
  };
}

/**
 * DTO for user existence check response
 */
export class UserExistsResponseDto {
  @ApiProperty({
    description: 'Whether user exists in local database',
    example: true,
  })
  exists: boolean;

  @ApiPropertyOptional({
    description: 'External user ID if exists',
    example: 'ext-user-123',
  })
  userId?: string;

  @ApiPropertyOptional({
    description: 'Last sync timestamp if exists',
    example: '2025-10-05T10:30:00.000Z',
  })
  lastSyncedAt?: Date;
}
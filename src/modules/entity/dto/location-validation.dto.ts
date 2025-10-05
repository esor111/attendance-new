import { IsString, IsNumber, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for location validation requests
 * Used to validate if a user's location is within an entity's allowed radius
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export class LocationValidationDto {
  @ApiProperty({
    description: 'Entity UUID to validate against',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4, { message: 'EntityId must be a valid UUID' })
  entityId: string;

  @ApiProperty({
    description: 'User current latitude coordinate',
    example: 27.7172,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90, { message: 'Latitude must be between -90 and 90 degrees' })
  @Max(90, { message: 'Latitude must be between -90 and 90 degrees' })
  latitude: number;

  @ApiProperty({
    description: 'User current longitude coordinate',
    example: 85.3240,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180, { message: 'Longitude must be between -180 and 180 degrees' })
  @Max(180, { message: 'Longitude must be between -180 and 180 degrees' })
  longitude: number;
}

/**
 * DTO for location validation response
 * Provides validation result with distance information
 * Requirements: 9.5
 */
export class LocationValidationResponseDto {
  @ApiProperty({
    description: 'Whether location is within allowed radius',
    example: true,
  })
  isValid: boolean;

  @ApiProperty({
    description: 'Actual distance from entity center in meters',
    example: 85.5,
  })
  distanceMeters: number;

  @ApiProperty({
    description: 'Entity allowed radius in meters',
    example: 100,
  })
  allowedRadiusMeters: number;

  @ApiProperty({
    description: 'Name of the entity being validated against',
    example: 'Main Office Kathmandu',
  })
  entityName: string;

  @ApiProperty({
    description: 'Human-readable validation message',
    example: 'Location is within allowed radius',
  })
  message: string;
}
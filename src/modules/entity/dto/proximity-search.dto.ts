import { IsNumber, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for proximity search requests
 * Validates search coordinates and radius parameters
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export class ProximitySearchDto {
  @ApiProperty({
    description: 'Search center latitude coordinate',
    example: 27.7172,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90, { message: 'Latitude must be between -90 and 90 degrees' })
  @Max(90, { message: 'Latitude must be between -90 and 90 degrees' })
  @Type(() => Number)
  latitude: number;

  @ApiProperty({
    description: 'Search center longitude coordinate',
    example: 85.3240,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180, { message: 'Longitude must be between -180 and 180 degrees' })
  @Max(180, { message: 'Longitude must be between -180 and 180 degrees' })
  @Type(() => Number)
  longitude: number;

  @ApiPropertyOptional({
    description: 'Search radius in meters (default: 1000m)',
    example: 1000,
    minimum: 10,
    maximum: 10000,
    default: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(10, { message: 'Search radius must be at least 10 meters' })
  @Max(10000, { message: 'Search radius cannot exceed 10000 meters' })
  @Type(() => Number)
  radiusMeters?: number = 1000;
}

/**
 * DTO for nearby entity search results
 * Includes entity data with calculated distance
 * Requirements: 6.4, 6.5
 */
export class NearbyEntityDto {
  @ApiProperty({
    description: 'Entity UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Entity name',
    example: 'Main Office Kathmandu',
  })
  name: string;

  @ApiProperty({
    description: 'Unique KahaId',
    example: 'KTM-MAIN-001',
  })
  kahaId: string;

  @ApiPropertyOptional({
    description: 'Entity address',
    example: 'Durbar Marg, Kathmandu 44600, Nepal',
  })
  address?: string;

  @ApiProperty({
    description: 'Entity latitude',
    example: 27.7172,
  })
  latitude: number;

  @ApiProperty({
    description: 'Entity longitude',
    example: 85.3240,
  })
  longitude: number;

  @ApiProperty({
    description: 'Entity check-in radius in meters',
    example: 100,
  })
  radiusMeters: number;

  @ApiProperty({
    description: 'Calculated distance from search point in meters',
    example: 250.5,
  })
  distanceMeters: number;

  @ApiPropertyOptional({
    description: 'Entity avatar image URL',
    example: 'https://example.com/images/office-avatar.jpg',
  })
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Entity cover image URL',
    example: 'https://example.com/images/office-cover.jpg',
  })
  coverImageUrl?: string;

  @ApiPropertyOptional({
    description: 'Entity description',
    example: 'Main headquarters office located in the heart of Kathmandu',
  })
  description?: string;
}
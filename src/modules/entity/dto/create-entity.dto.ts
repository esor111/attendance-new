import { IsString, IsNumber, IsOptional, Min, Max, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new Entity (Business Location)
 * Validates coordinates, radius, and required fields
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */
export class CreateEntityDto {
  @ApiProperty({
    description: 'Name of the business location',
    example: 'Main Office Kathmandu',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty({
    description: 'Unique identifier for the business location (must be unique across all entities)',
    example: 'KTM-MAIN-001',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  kahaId: string;

  @ApiPropertyOptional({
    description: 'Physical address of the business location',
    example: 'Durbar Marg, Kathmandu 44600, Nepal',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Latitude coordinate in WGS84 format',
    example: 27.7172,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90, { message: 'Latitude must be between -90 and 90 degrees' })
  @Max(90, { message: 'Latitude must be between -90 and 90 degrees' })
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate in WGS84 format',
    example: 85.3240,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180, { message: 'Longitude must be between -180 and 180 degrees' })
  @Max(180, { message: 'Longitude must be between -180 and 180 degrees' })
  longitude: number;

  @ApiProperty({
    description: 'Allowed check-in radius in meters (minimum 10m, maximum 1000m)',
    example: 100,
    minimum: 10,
    maximum: 1000,
  })
  @IsNumber()
  @Min(10, { message: 'Radius must be at least 10 meters' })
  @Max(1000, { message: 'Radius cannot exceed 1000 meters' })
  radiusMeters: number;

  @ApiPropertyOptional({
    description: 'URL to the entity avatar image',
    example: 'https://example.com/images/office-avatar.jpg',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'URL to the entity cover image',
    example: 'https://example.com/images/office-cover.jpg',
  })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional({
    description: 'Description of the business location',
    example: 'Main headquarters office located in the heart of Kathmandu',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
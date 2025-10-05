import { IsNumber, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for proximity search requests
 * Validates search coordinates and radius parameters
 */
export class ProximitySearchDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude: number; // Search center latitude

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude: number; // Search center longitude

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(10000) // Allow up to 10km search radius
  @Type(() => Number)
  radiusMeters?: number = 1000; // Default 1km search radius
}

/**
 * DTO for nearby entity search results
 * Includes entity data with calculated distance
 */
export class NearbyEntityDto {
  id: string;
  name: string;
  kahaId: string;
  address?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  distanceMeters: number; // Calculated distance from search point
  avatarUrl?: string;
  coverImageUrl?: string;
  description?: string;
}
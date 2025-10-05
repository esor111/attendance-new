import { IsString, IsNumber, Min, Max, IsUUID } from 'class-validator';

/**
 * DTO for location validation requests
 * Used to validate if a user's location is within an entity's allowed radius
 */
export class LocationValidationDto {
  @IsUUID()
  entityId: string; // Entity to validate against

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number; // User's current latitude

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number; // User's current longitude
}

/**
 * DTO for location validation response
 * Provides validation result with distance information
 */
export class LocationValidationResponseDto {
  isValid: boolean; // Whether location is within allowed radius
  distanceMeters: number; // Actual distance from entity center
  allowedRadiusMeters: number; // Entity's allowed radius
  entityName: string; // Name of the entity being validated against
  message: string; // Human-readable validation message
}
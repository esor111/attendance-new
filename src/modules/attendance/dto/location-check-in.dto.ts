import { IsNumber, IsOptional, IsString, Max, MaxLength, Min, IsUUID } from 'class-validator';

/**
 * Location Check-In DTO - Validates field worker location check-in requests
 * For client site visits and field work tracking
 */
export class LocationCheckInDto {
  @IsUUID(4, { message: 'EntityId must be a valid UUID' })
  entityId: string;

  @IsNumber({}, { message: 'Latitude must be a valid number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90 degrees' })
  @Max(90, { message: 'Latitude must be between -90 and 90 degrees' })
  latitude: number;

  @IsNumber({}, { message: 'Longitude must be a valid number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180 degrees' })
  @Max(180, { message: 'Longitude must be between -180 and 180 degrees' })
  longitude: number;

  @IsOptional()
  @IsString({ message: 'Purpose must be a string' })
  @MaxLength(500, { message: 'Purpose cannot exceed 500 characters' })
  purpose?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  notes?: string;
}
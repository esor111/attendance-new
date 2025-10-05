import { IsString, IsNumber, IsOptional, Min, Max, Length } from 'class-validator';

/**
 * DTO for updating an existing Entity (Business Location)
 * Validates coordinates, radius, and optional fields
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */
export class UpdateEntityDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number; // WGS84 latitude

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number; // WGS84 longitude

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  radiusMeters?: number; // Allowed check-in radius (10m to 1km)

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
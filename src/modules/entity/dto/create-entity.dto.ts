import { IsString, IsNumber, IsOptional, Min, Max, Length } from 'class-validator';

/**
 * DTO for creating a new Entity (Business Location)
 * Validates coordinates, radius, and required fields
 */
export class CreateEntityDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  @Length(1, 100)
  kahaId: string; // Unique identifier for the business location

  @IsOptional()
  @IsString()
  address?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number; // WGS84 latitude

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number; // WGS84 longitude

  @IsNumber()
  @Min(10)
  @Max(1000)
  radiusMeters: number; // Allowed check-in radius (10m to 1km)

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
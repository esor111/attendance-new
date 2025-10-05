import { IsNumber, IsOptional, IsString, Max, MaxLength, Min, IsIn } from 'class-validator';

/**
 * Clock-In DTO - Validates employee clock-in requests
 * Ensures coordinates are within valid ranges and notes are reasonable length
 */
export class ClockInDto {
  @IsNumber({}, { message: 'Latitude must be a valid number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90 degrees' })
  @Max(90, { message: 'Latitude must be between -90 and 90 degrees' })
  latitude: number;

  @IsNumber({}, { message: 'Longitude must be a valid number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180 degrees' })
  @Max(180, { message: 'Longitude must be between -180 and 180 degrees' })
  longitude: number;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  notes?: string;

  @IsOptional()
  @IsIn(['OFFICE', 'REMOTE', 'FIELD'], { 
    message: 'Work location must be one of: OFFICE, REMOTE, FIELD' 
  })
  workLocation?: 'OFFICE' | 'REMOTE' | 'FIELD';

  @IsOptional()
  @IsString({ message: 'Remote location must be a string' })
  @MaxLength(255, { message: 'Remote location cannot exceed 255 characters' })
  remoteLocation?: string;
}
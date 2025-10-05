import { IsNumber, IsOptional, IsString, Max, MaxLength, Min, IsIn } from 'class-validator';

/**
 * Session Check-In DTO - Validates session check-in requests for breaks, meetings, etc.
 * Includes session type validation and coordinate validation
 */
export class SessionCheckInDto {
  @IsNumber({}, { message: 'Latitude must be a valid number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90 degrees' })
  @Max(90, { message: 'Latitude must be between -90 and 90 degrees' })
  latitude: number;

  @IsNumber({}, { message: 'Longitude must be a valid number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180 degrees' })
  @Max(180, { message: 'Longitude must be between -180 and 180 degrees' })
  longitude: number;

  @IsOptional()
  @IsString({ message: 'Session type must be a string' })
  @IsIn(['work', 'break', 'lunch', 'meeting', 'errand'], {
    message: 'Session type must be one of: work, break, lunch, meeting, errand'
  })
  sessionType?: string = 'work';

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  notes?: string;
}
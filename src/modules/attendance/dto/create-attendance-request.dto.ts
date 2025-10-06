import { IsString, IsDateString, MaxLength, IsNotEmpty } from 'class-validator';

/**
 * DTO for creating attendance requests
 * Validates required fields for employee attendance request submission
 */
export class CreateAttendanceRequestDto {
  @IsDateString({}, { message: 'Requested date must be a valid date string (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Requested date is required' })
  requestedDate: string;

  @IsString({ message: 'Reason must be a string' })
  @IsNotEmpty({ message: 'Reason is required' })
  @MaxLength(1000, { message: 'Reason cannot exceed 1000 characters' })
  reason: string;
}
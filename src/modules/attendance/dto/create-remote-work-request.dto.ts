import { IsString, IsDateString, MaxLength, IsOptional } from 'class-validator';

/**
 * DTO for creating remote work requests
 * Validates input data for remote work request submission
 */
export class CreateRemoteWorkRequestDto {
  @IsDateString({}, { message: 'Requested date must be a valid date string (YYYY-MM-DD)' })
  requestedDate: string;

  @IsString({ message: 'Reason must be a string' })
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason: string;

  @IsString({ message: 'Remote location must be a string' })
  @MaxLength(255, { message: 'Remote location cannot exceed 255 characters' })
  remoteLocation: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(1000, { message: 'Notes cannot exceed 1000 characters' })
  notes?: string;
}
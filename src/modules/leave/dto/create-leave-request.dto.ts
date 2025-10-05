import { IsUUID, IsDateString, IsNumber, IsOptional, IsString, IsBoolean, Min } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for creating a new leave request
 * Includes validation for date range, leave type, and optional emergency handling
 */
export class CreateLeaveRequestDto {
  @IsUUID(4, { message: 'Leave type ID must be a valid UUID' })
  leaveTypeId: string;

  @IsDateString({}, { message: 'Start date must be a valid date string (YYYY-MM-DD)' })
  startDate: string;

  @IsDateString({}, { message: 'End date must be a valid date string (YYYY-MM-DD)' })
  endDate: string;

  @IsNumber({}, { message: 'Days requested must be a number' })
  @Min(0.5, { message: 'Days requested must be at least 0.5' })
  @Transform(({ value }) => parseFloat(value))
  daysRequested: number;

  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  reason?: string;

  @IsOptional()
  @IsBoolean({ message: 'Is emergency must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  isEmergency?: boolean;

  @IsOptional()
  @IsString({ message: 'Emergency justification must be a string' })
  emergencyJustification?: string;
}
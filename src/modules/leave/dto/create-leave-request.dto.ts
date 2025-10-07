import { IsDateString, IsNumber, IsOptional, IsString, IsBoolean, IsEnum, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { LeaveType } from '../entities/leave-request.entity';

/**
 * DTO for creating a new leave request
 * Includes validation for date range, leave type, and optional emergency handling
 * Updated to use leave type enum instead of UUID reference
 */
export class CreateLeaveRequestDto {
  @IsEnum(LeaveType, { message: 'Leave type must be a valid leave type (ANNUAL, SICK, PERSONAL, EMERGENCY)' })
  leaveType: LeaveType;

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
import { IsString, IsDateString, IsEnum, IsOptional, IsBoolean, Length, IsUUID } from 'class-validator';
import { HolidayType, RecurrenceType } from '../entities/holiday.entity';

/**
 * Create Holiday DTO - Validates holiday creation requests
 * Ensures proper validation for holiday name, date, type, and recurrence
 * Supports department-specific holidays and optional descriptions
 */
export class CreateHolidayDto {
  @IsString({ message: 'Holiday name must be a string' })
  @Length(1, 100, { message: 'Holiday name must be between 1 and 100 characters' })
  name: string;

  @IsDateString({}, { message: 'Date must be a valid date string (YYYY-MM-DD)' })
  date: string;

  @IsEnum(HolidayType, { message: 'Type must be NATIONAL, COMPANY, or DEPARTMENT' })
  type: HolidayType;

  @IsOptional()
  @IsEnum(RecurrenceType, { message: 'Recurrence must be NONE, YEARLY, or MONTHLY' })
  recurrence?: RecurrenceType = RecurrenceType.NONE;

  @IsOptional()
  @IsUUID(4, { message: 'Department ID must be a valid UUID' })
  departmentId?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Length(0, 500, { message: 'Description must be 500 characters or less' })
  description?: string;

  @IsOptional()
  @IsBoolean({ message: 'Is active must be a boolean' })
  isActive?: boolean = true;
}
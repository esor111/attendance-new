import { IsOptional, IsDateString, IsUUID, IsEnum, IsNumberString } from 'class-validator';
import { HolidayType } from '../entities/holiday.entity';

/**
 * Holiday Query DTO - Validates holiday retrieval requests
 * Supports filtering by date range, department, type, and year
 * Used for holiday calendar and date range queries
 */
export class HolidayQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid date string (YYYY-MM-DD)' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date string (YYYY-MM-DD)' })
  endDate?: string;

  @IsOptional()
  @IsUUID(4, { message: 'Department ID must be a valid UUID' })
  departmentId?: string;

  @IsOptional()
  @IsEnum(HolidayType, { message: 'Type must be NATIONAL, COMPANY, or DEPARTMENT' })
  type?: HolidayType;

  @IsOptional()
  @IsNumberString({}, { message: 'Year must be a valid number' })
  year?: string;
}
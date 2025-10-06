import { IsString, IsArray, IsBoolean, IsOptional, MaxLength, ArrayMinSize, ArrayMaxSize } from 'class-validator';

/**
 * DTO for creating department schedules
 * Validates working hours and days for department-level schedule management
 */
export class CreateDepartmentScheduleDto {
  @IsString({ message: 'Name must be a string' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name: string;

  @IsString({ message: 'Start time must be a valid time string (HH:MM format)' })
  startTime: string; // "09:00"

  @IsString({ message: 'End time must be a valid time string (HH:MM format)' })
  endTime: string; // "18:00"

  @IsArray({ message: 'Work days must be an array of numbers' })
  @ArrayMinSize(1, { message: 'At least one work day must be specified' })
  @ArrayMaxSize(7, { message: 'Cannot have more than 7 work days' })
  workDays: number[]; // [0,1,2,3,4,5] = Sun-Fri, [1,2,3,4,5] = Mon-Fri

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive?: boolean;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;
}
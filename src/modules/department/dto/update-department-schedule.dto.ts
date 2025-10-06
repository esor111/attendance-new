import { IsString, IsArray, IsBoolean, IsOptional, MaxLength, ArrayMinSize, ArrayMaxSize } from 'class-validator';

/**
 * DTO for updating department schedules
 * All fields are optional for partial updates
 */
export class UpdateDepartmentScheduleDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Start time must be a valid time string (HH:MM format)' })
  startTime?: string;

  @IsOptional()
  @IsString({ message: 'End time must be a valid time string (HH:MM format)' })
  endTime?: string;

  @IsOptional()
  @IsArray({ message: 'Work days must be an array of numbers' })
  @ArrayMinSize(1, { message: 'At least one work day must be specified' })
  @ArrayMaxSize(7, { message: 'Cannot have more than 7 work days' })
  workDays?: number[];

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive?: boolean;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;
}
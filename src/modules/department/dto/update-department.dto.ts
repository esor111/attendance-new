import { IsString, IsOptional, Length } from 'class-validator';

/**
 * DTO for updating department information
 * Requirements: 3.2
 */
export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Department name must be between 1 and 100 characters' })
  name?: string;
}
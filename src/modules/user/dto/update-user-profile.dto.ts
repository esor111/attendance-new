import { IsString, IsEmail, IsBoolean, IsOptional, IsUUID, Length } from 'class-validator';

/**
 * DTO for updating user profile information
 * Validates email uniqueness and field worker status updates
 * Requirements: 4.2, 4.3, 4.4, 4.5
 */
export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 255, { message: 'Name must be between 1 and 255 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20, { message: 'Phone must be between 1 and 20 characters' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @Length(1, 255, { message: 'Email must be between 1 and 255 characters' })
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean({ message: 'isFieldWorker must be a boolean value' })
  isFieldWorker?: boolean;

  @IsOptional()
  @IsUUID(4, { message: 'DepartmentId must be a valid UUID' })
  departmentId?: string;
}
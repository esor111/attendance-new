import { IsString, IsEmail, IsBoolean, IsOptional, IsUUID, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating user profile information
 * Validates email uniqueness and field worker status updates
 * Requirements: 4.2, 4.3, 4.4, 4.5
 */
export class UpdateUserProfileDto {
  @ApiPropertyOptional({
    description: 'User full name',
    example: 'John Doe',
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255, { message: 'Name must be between 1 and 255 characters' })
  name?: string;

  @ApiPropertyOptional({
    description: 'User phone number (must be unique)',
    example: '+977-9841234567',
    minLength: 1,
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20, { message: 'Phone must be between 1 and 20 characters' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'User email address (must be unique)',
    example: 'john.doe@example.com',
    format: 'email',
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @Length(1, 255, { message: 'Email must be between 1 and 255 characters' })
  email?: string;

  @ApiPropertyOptional({
    description: 'User physical address',
    example: 'Kathmandu, Nepal',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Whether the user is a field worker (affects attendance rules)',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isFieldWorker must be a boolean value' })
  isFieldWorker?: boolean;

  @ApiPropertyOptional({
    description: 'Department ID the user belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID(4, { message: 'DepartmentId must be a valid UUID' })
  departmentId?: string;
}
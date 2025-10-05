import { IsString, IsUUID, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a new department
 * Requirements: 3.1, 3.2, 3.3
 */
export class CreateDepartmentDto {
  @ApiProperty({
    description: 'Department name (must be unique within the business)',
    example: 'Human Resources',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100, { message: 'Department name must be between 1 and 100 characters' })
  name: string;

  @ApiProperty({
    description: 'Business ID from external microservice',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID(4, { message: 'BusinessId must be a valid UUID' })
  businessId: string;
}
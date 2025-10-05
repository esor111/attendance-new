import { IsString, IsUUID, Length } from 'class-validator';

/**
 * DTO for creating a new department
 * Requirements: 3.1, 3.2, 3.3
 */
export class CreateDepartmentDto {
  @IsString()
  @Length(1, 100, { message: 'Department name must be between 1 and 100 characters' })
  name: string;

  @IsUUID(4, { message: 'BusinessId must be a valid UUID' })
  businessId: string;
}
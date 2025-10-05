import { IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO for updating user entity assignments
 * Requirements: 5.2, 5.6 - Primary entity management
 */
export class UpdateUserEntityAssignmentDto {
  @IsOptional()
  @IsBoolean({ message: 'isPrimary must be a boolean value' })
  isPrimary?: boolean;
}
import { IsUUID, IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO for creating user entity assignments
 * Requirements: 5.1, 5.2 - User-specific entity assignments with primary designation
 */
export class CreateUserEntityAssignmentDto {
  @IsUUID(4, { message: 'UserId must be a valid UUID' })
  userId: string;

  @IsUUID(4, { message: 'EntityId must be a valid UUID' })
  entityId: string;

  @IsOptional()
  @IsBoolean({ message: 'isPrimary must be a boolean value' })
  isPrimary?: boolean = false;
}
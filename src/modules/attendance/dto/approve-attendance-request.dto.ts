import { IsString, IsIn, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO for approving or rejecting attendance requests
 * Validates approval action and optional notes
 */
export class ApproveAttendanceRequestDto {
  @IsString({ message: 'Action must be a string' })
  @IsIn(['APPROVE', 'REJECT'], { message: 'Action must be either APPROVE or REJECT' })
  action: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  notes?: string;
}
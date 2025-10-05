import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for approving or rejecting remote work requests
 * Validates manager approval decisions
 */
export class ApproveRemoteWorkRequestDto {
  @IsIn(['APPROVED', 'REJECTED'], { 
    message: 'Decision must be either APPROVED or REJECTED' 
  })
  decision: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString({ message: 'Approval notes must be a string' })
  @MaxLength(1000, { message: 'Approval notes cannot exceed 1000 characters' })
  approvalNotes?: string;
}
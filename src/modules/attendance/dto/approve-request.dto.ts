import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { RequestStatus } from '../entities/request.entity';

/**
 * DTO for approving or rejecting requests
 * Unified approval DTO that works for all request types
 */
export class ApproveRequestDto {
  @IsEnum([RequestStatus.APPROVED, RequestStatus.REJECTED], {
    message: 'Status must be either APPROVED or REJECTED',
  })
  status: RequestStatus.APPROVED | RequestStatus.REJECTED;

  @IsOptional()
  @IsString({ message: 'Approval notes must be a string' })
  @MaxLength(1000, { message: 'Approval notes cannot exceed 1000 characters' })
  notes?: string;

  @IsOptional()
  @IsString({ message: 'Rejection reason must be a string' })
  @MaxLength(1000, { message: 'Rejection reason cannot exceed 1000 characters' })
  rejectionReason?: string;
}

/**
 * Legacy DTOs for backward compatibility
 * These will be deprecated in favor of the unified ApproveRequestDto
 */

/**
 * @deprecated Use ApproveRequestDto instead
 */
export class ApproveLeaveRequestDto {
  @IsEnum([RequestStatus.APPROVED, RequestStatus.REJECTED], {
    message: 'Status must be either APPROVED or REJECTED',
  })
  status: RequestStatus.APPROVED | RequestStatus.REJECTED;

  @IsOptional()
  @IsString({ message: 'Comments must be a string' })
  @MaxLength(1000, { message: 'Comments cannot exceed 1000 characters' })
  comments?: string;

  @IsOptional()
  @IsString({ message: 'Rejection reason must be a string' })
  @MaxLength(1000, { message: 'Rejection reason cannot exceed 1000 characters' })
  rejectionReason?: string;
}

/**
 * @deprecated Use ApproveRequestDto instead
 */
export class ApproveRemoteWorkRequestDto {
  @IsEnum(['APPROVED', 'REJECTED'], {
    message: 'Decision must be either APPROVED or REJECTED',
  })
  decision: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString({ message: 'Approval notes must be a string' })
  @MaxLength(1000, { message: 'Approval notes cannot exceed 1000 characters' })
  approvalNotes?: string;
}

/**
 * @deprecated Use ApproveRequestDto instead
 */
export class ApproveAttendanceRequestDto {
  @IsEnum(['APPROVE', 'REJECT'], {
    message: 'Action must be either APPROVE or REJECT',
  })
  action: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  notes?: string;
}
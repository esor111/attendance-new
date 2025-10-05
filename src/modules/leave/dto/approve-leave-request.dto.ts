import { IsOptional, IsString, IsEnum } from 'class-validator';
import { LeaveRequestStatus } from '../entities/leave-request.entity';

/**
 * DTO for approving or rejecting a leave request
 * Includes approval decision and optional comments
 */
export class ApproveLeaveRequestDto {
  @IsEnum(LeaveRequestStatus, { 
    message: 'Status must be either APPROVED or REJECTED' 
  })
  status: LeaveRequestStatus.APPROVED | LeaveRequestStatus.REJECTED;

  @IsOptional()
  @IsString({ message: 'Comments must be a string' })
  comments?: string;

  @IsOptional()
  @IsString({ message: 'Rejection reason must be a string' })
  rejectionReason?: string;
}
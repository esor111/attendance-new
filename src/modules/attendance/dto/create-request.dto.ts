import { IsEnum, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestType } from '../entities/request.entity';

/**
 * Base DTO for creating requests
 */
export class CreateRequestDto {
  @IsEnum(RequestType, { message: 'Request type must be a valid request type' })
  type: RequestType;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(1000, { message: 'Notes cannot exceed 1000 characters' })
  notes?: string;
}

/**
 * Leave request specific data DTO
 */
export class CreateLeaveRequestDataDto {
  @IsEnum(['ANNUAL', 'SICK', 'PERSONAL', 'EMERGENCY'], { 
    message: 'Leave type must be one of: ANNUAL, SICK, PERSONAL, EMERGENCY' 
  })
  leaveType: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'EMERGENCY';

  @IsString({ message: 'Start date must be a string' })
  startDate: string;

  @IsString({ message: 'End date must be a string' })
  endDate: string;

  @IsString({ message: 'Days requested must be a number' })
  daysRequested: number;

  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason?: string;

  @IsOptional()
  isEmergency?: boolean;

  @IsOptional()
  @IsString({ message: 'Emergency justification must be a string' })
  @MaxLength(500, { message: 'Emergency justification cannot exceed 500 characters' })
  emergencyJustification?: string;

  balanceInfo: {
    allocatedDays: number;
    usedDays: number;
    remainingDays: number;
  };
}

/**
 * Remote work request specific data DTO
 */
export class CreateRemoteWorkRequestDataDto {
  @IsString({ message: 'Requested date must be a string' })
  requestedDate: string;

  @IsString({ message: 'Reason must be a string' })
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason: string;

  @IsString({ message: 'Remote location must be a string' })
  @MaxLength(255, { message: 'Remote location cannot exceed 255 characters' })
  remoteLocation: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  notes?: string;
}

/**
 * Attendance correction request specific data DTO
 */
export class CreateAttendanceCorrectionRequestDataDto {
  @IsString({ message: 'Requested date must be a string' })
  requestedDate: string;

  @IsString({ message: 'Reason must be a string' })
  @MaxLength(1000, { message: 'Reason cannot exceed 1000 characters' })
  reason: string;

  @IsOptional()
  @IsString({ message: 'Request deadline must be a string' })
  requestDeadline?: string;
}

/**
 * Discriminated union DTO for creating different types of requests
 */
export class CreateLeaveRequestDto extends CreateRequestDto {
  @IsEnum([RequestType.LEAVE])
  type: RequestType.LEAVE;

  @ValidateNested()
  @Type(() => CreateLeaveRequestDataDto)
  requestData: CreateLeaveRequestDataDto;
}

export class CreateRemoteWorkRequestDto extends CreateRequestDto {
  @IsEnum([RequestType.REMOTE_WORK])
  type: RequestType.REMOTE_WORK;

  @ValidateNested()
  @Type(() => CreateRemoteWorkRequestDataDto)
  requestData: CreateRemoteWorkRequestDataDto;
}

export class CreateAttendanceCorrectionRequestDto extends CreateRequestDto {
  @IsEnum([RequestType.ATTENDANCE_CORRECTION])
  type: RequestType.ATTENDANCE_CORRECTION;

  @ValidateNested()
  @Type(() => CreateAttendanceCorrectionRequestDataDto)
  requestData: CreateAttendanceCorrectionRequestDataDto;
}

/**
 * Union type for all create request DTOs
 */
export type CreateAnyRequestDto = 
  | CreateLeaveRequestDto 
  | CreateRemoteWorkRequestDto 
  | CreateAttendanceCorrectionRequestDto;
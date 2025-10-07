import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { IsUUID, IsOptional, IsString, IsEnum, IsDate, MaxLength } from 'class-validator';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { DailyAttendance } from './daily-attendance.entity';

/**
 * Request Types - Unified enum for all request types
 */
export enum RequestType {
  LEAVE = 'LEAVE',
  REMOTE_WORK = 'REMOTE_WORK',
  ATTENDANCE_CORRECTION = 'ATTENDANCE_CORRECTION',
}

/**
 * Request Status - Common status enum for all request types
 */
export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

/**
 * Type-specific request data interfaces
 */
export interface LeaveRequestData {
  leaveType: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'EMERGENCY';
  startDate: string;
  endDate: string;
  daysRequested: number;
  reason?: string;
  isEmergency?: boolean;
  emergencyJustification?: string;
  balanceInfo: {
    allocatedDays: number;
    usedDays: number;
    remainingDays: number;
  };
}

export interface RemoteWorkRequestData {
  requestedDate: string;
  reason: string;
  remoteLocation: string;
  notes?: string;
}

export interface AttendanceCorrectionRequestData {
  requestedDate: string;
  reason: string;
  requestDeadline?: string;
}

/**
 * Unified Request Entity - Consolidates all request types into single table
 * Uses discriminated union pattern with JSON data column for type-specific fields
 * Eliminates duplicate approval workflows and reduces maintenance overhead
 */
@Entity('requests')
@Index('idx_request_user_type', ['userId', 'type'])
@Index('idx_request_status', ['status'])
@Index('idx_request_approver', ['approverId'])
@Index('idx_request_type', ['type'])
@Index('idx_request_created', ['createdAt'])
export class Request extends BaseEntity {
  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  userId: string;

  @Column({ type: 'enum', enum: RequestType })
  @IsEnum(RequestType, { message: 'Request type must be a valid request type' })
  type: RequestType;

  @Column({ type: 'json' })
  requestData: LeaveRequestData | RemoteWorkRequestData | AttendanceCorrectionRequestData;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING,
  })
  @IsEnum(RequestStatus, { message: 'Status must be a valid request status' })
  status: RequestStatus;

  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID(4, { message: 'Approver ID must be a valid UUID' })
  approverId?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate({ message: 'Approval date must be a valid date' })
  approvedAt?: Date;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Approval notes must be a string' })
  @MaxLength(1000, { message: 'Approval notes cannot exceed 1000 characters' })
  approvalNotes?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Rejection reason must be a string' })
  @MaxLength(1000, { message: 'Rejection reason cannot exceed 1000 characters' })
  rejectionReason?: string;

  @Column({ type: 'timestamp with time zone' })
  @IsDate({ message: 'Requested at must be a valid date' })
  requestedAt: Date;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Additional notes must be a string' })
  @MaxLength(1000, { message: 'Additional notes cannot exceed 1000 characters' })
  notes?: string;

  // For attendance correction requests - reference to created attendance record
  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID(4, { message: 'Created attendance ID must be a valid UUID' })
  createdAttendanceId?: string;

  // Relationships
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'approver_id' })
  approver?: User;

  @ManyToOne(() => DailyAttendance, { eager: false, nullable: true })
  @JoinColumn({ name: 'created_attendance_id' })
  createdAttendance?: DailyAttendance;

  /**
   * Type guard to check if request is leave request
   */
  isLeaveRequest(): this is Request & { requestData: LeaveRequestData } {
    return this.type === RequestType.LEAVE;
  }

  /**
   * Type guard to check if request is remote work request
   */
  isRemoteWorkRequest(): this is Request & { requestData: RemoteWorkRequestData } {
    return this.type === RequestType.REMOTE_WORK;
  }

  /**
   * Type guard to check if request is attendance correction request
   */
  isAttendanceCorrectionRequest(): this is Request & { requestData: AttendanceCorrectionRequestData } {
    return this.type === RequestType.ATTENDANCE_CORRECTION;
  }

  /**
   * Get type-specific display name
   */
  getDisplayName(): string {
    switch (this.type) {
      case RequestType.LEAVE:
        const leaveData = this.requestData as LeaveRequestData;
        return `${leaveData.leaveType.toLowerCase().replace('_', ' ')} Leave Request`;
      case RequestType.REMOTE_WORK:
        return 'Remote Work Request';
      case RequestType.ATTENDANCE_CORRECTION:
        return 'Attendance Correction Request';
      default:
        return 'Request';
    }
  }

  /**
   * Get primary date for the request (used for sorting and filtering)
   */
  getPrimaryDate(): Date {
    switch (this.type) {
      case RequestType.LEAVE:
        const leaveData = this.requestData as LeaveRequestData;
        return new Date(leaveData.startDate);
      case RequestType.REMOTE_WORK:
        const remoteData = this.requestData as RemoteWorkRequestData;
        return new Date(remoteData.requestedDate);
      case RequestType.ATTENDANCE_CORRECTION:
        const attendanceData = this.requestData as AttendanceCorrectionRequestData;
        return new Date(attendanceData.requestedDate);
      default:
        return this.createdAt;
    }
  }

  /**
   * Check if request requires approval based on type and data
   */
  requiresApproval(): boolean {
    switch (this.type) {
      case RequestType.LEAVE:
        const leaveData = this.requestData as LeaveRequestData;
        // Sick leave doesn't require approval
        return leaveData.leaveType !== 'SICK';
      case RequestType.REMOTE_WORK:
        return true; // All remote work requests require approval
      case RequestType.ATTENDANCE_CORRECTION:
        return true; // All attendance corrections require approval
      default:
        return true;
    }
  }
}
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { IsUUID, IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

export enum LeaveRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  PERSONAL = 'PERSONAL',
  EMERGENCY = 'EMERGENCY',
}

export interface LeaveBalanceInfo {
  allocatedDays: number;
  usedDays: number;
  remainingDays: number;
}

/**
 * Leave Request Entity - Simplified leave management with embedded leave type and balance tracking
 * Consolidates leave types, requests, and balances into a single entity
 * Eliminates complex relationships and reduces maintenance overhead
 */
@Entity('leave_requests')
@Index('idx_leave_request_user_dates', ['userId', 'startDate', 'endDate'])
@Index('idx_leave_request_status', ['status'])
@Index('idx_leave_request_approver', ['approverId'])
@Index('idx_leave_request_type', ['leaveType'])
export class LeaveRequest extends BaseEntity {
  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  userId: string;

  @Column({ type: 'enum', enum: LeaveType })
  @IsEnum(LeaveType, { message: 'Leave type must be a valid leave type' })
  leaveType: LeaveType;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'decimal', precision: 3, scale: 1 })
  @IsNumber({}, { message: 'Days requested must be a number' })
  @Min(0.5, { message: 'Days requested must be at least 0.5' })
  daysRequested: number;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  reason?: string;

  @Column({
    type: 'enum',
    enum: LeaveRequestStatus,
    default: LeaveRequestStatus.PENDING,
  })
  status: LeaveRequestStatus;

  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID(4, { message: 'Approver ID must be a valid UUID' })
  approverId?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  approvedAt?: Date;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Approval comments must be a string' })
  approvalComments?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Rejection reason must be a string' })
  rejectionReason?: string;

  @Column({ type: 'boolean', default: false })
  isEmergency: boolean;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Emergency justification must be a string' })
  emergencyJustification?: string;

  @Column({ type: 'json' })
  balanceInfo: LeaveBalanceInfo;

  // Relationships
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'approver_id' })
  approver?: User;

  /**
   * Get leave type configuration based on enum value
   */
  getLeaveTypeConfig(): {
    name: string;
    maxDaysPerYear: number;
    requiresApproval: boolean;
    canCarryForward: boolean;
    maxCarryForwardDays: number;
    minAdvanceNoticeDays: number;
  } {
    const configs = {
      [LeaveType.ANNUAL]: {
        name: 'Annual Leave',
        maxDaysPerYear: 25,
        requiresApproval: true,
        canCarryForward: true,
        maxCarryForwardDays: 5,
        minAdvanceNoticeDays: 7,
      },
      [LeaveType.SICK]: {
        name: 'Sick Leave',
        maxDaysPerYear: 10,
        requiresApproval: false,
        canCarryForward: false,
        maxCarryForwardDays: 0,
        minAdvanceNoticeDays: 0,
      },
      [LeaveType.PERSONAL]: {
        name: 'Personal Leave',
        maxDaysPerYear: 5,
        requiresApproval: true,
        canCarryForward: false,
        maxCarryForwardDays: 0,
        minAdvanceNoticeDays: 3,
      },
      [LeaveType.EMERGENCY]: {
        name: 'Emergency Leave',
        maxDaysPerYear: 3,
        requiresApproval: true,
        canCarryForward: false,
        maxCarryForwardDays: 0,
        minAdvanceNoticeDays: 0,
      },
    };

    return configs[this.leaveType];
  }
}
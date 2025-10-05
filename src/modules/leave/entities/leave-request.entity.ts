import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { IsUUID, IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { LeaveType } from './leave-type.entity';

export enum LeaveRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}


/**
 * Leave Request Entity - Tracks employee leave requests with approval workflow
 * Includes date range, status tracking, and approval chain management
 */
@Entity('leave_requests')
@Index('idx_leave_request_user_dates', ['userId', 'startDate', 'endDate'])
@Index('idx_leave_request_status', ['status'])
@Index('idx_leave_request_approver', ['approverId'])
export class LeaveRequest extends BaseEntity {
  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  userId: string;

  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'Leave type ID must be a valid UUID' })
  leaveTypeId: string;

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

  // Relationships
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => LeaveType, (leaveType) => leaveType.leaveRequests, { eager: false })
  @JoinColumn({ name: 'leave_type_id' })
  leaveType: LeaveType;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'approver_id' })
  approver?: User;
}
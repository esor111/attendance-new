import { Entity, Column, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { IsUUID, IsNumber, Min } from 'class-validator';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { LeaveType } from './leave-type.entity';

/**
 * Leave Balance Entity - Tracks employee leave balances by type and year
 * Includes allocated, used, and remaining leave calculations with carry forward support
 */
@Entity('leave_balances')
@Unique('unique_user_leave_type_year', ['userId', 'leaveTypeId', 'year'])
@Index('idx_leave_balance_user_year', ['userId', 'year'])
export class LeaveBalance extends BaseEntity {
  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  userId: string;

  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'Leave type ID must be a valid UUID' })
  leaveTypeId: string;

  @Column({ type: 'integer' })
  @IsNumber({}, { message: 'Year must be a number' })
  @Min(2020, { message: 'Year must be 2020 or later' })
  year: number;

  @Column({ type: 'decimal', precision: 4, scale: 1, default: 0 })
  @IsNumber({}, { message: 'Allocated days must be a number' })
  @Min(0, { message: 'Allocated days cannot be negative' })
  allocatedDays: number;

  @Column({ type: 'decimal', precision: 4, scale: 1, default: 0 })
  @IsNumber({}, { message: 'Used days must be a number' })
  @Min(0, { message: 'Used days cannot be negative' })
  usedDays: number;

  @Column({ type: 'decimal', precision: 4, scale: 1, default: 0 })
  @IsNumber({}, { message: 'Carried forward days must be a number' })
  @Min(0, { message: 'Carried forward days cannot be negative' })
  carriedForwardDays: number;

  @Column({ type: 'decimal', precision: 4, scale: 1, default: 0 })
  @IsNumber({}, { message: 'Pending days must be a number' })
  @Min(0, { message: 'Pending days cannot be negative' })
  pendingDays: number;

  // Computed field - calculated as allocatedDays + carriedForwardDays - usedDays - pendingDays
  get remainingDays(): number {
    return this.allocatedDays + this.carriedForwardDays - this.usedDays - this.pendingDays;
  }

  // Computed field - total available days for the year
  get totalAvailableDays(): number {
    return this.allocatedDays + this.carriedForwardDays;
  }

  // Relationships
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => LeaveType, (leaveType) => leaveType.leaveBalances, { eager: false })
  @JoinColumn({ name: 'leave_type_id' })
  leaveType: LeaveType;
}
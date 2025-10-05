import { Entity, Column, OneToMany } from 'typeorm';
import { IsString, IsNumber, IsBoolean, Length, Min, Max } from 'class-validator';
import { BaseEntity } from '../../../common/entities/base.entity';
import { LeaveRequest } from './leave-request.entity';
import { LeaveBalance } from './leave-balance.entity';

/**
 * Leave Type Entity - Defines different types of leave available in the system
 * Includes configuration for maximum days, approval requirements, and carry forward rules
 */
@Entity('leave_types')
export class LeaveType extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  @IsString({ message: 'Leave type name must be a string' })
  @Length(1, 100, { message: 'Leave type name must be between 1 and 100 characters' })
  name: string;

  @Column({ type: 'text', nullable: true })
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @Column({ type: 'integer' })
  @IsNumber({}, { message: 'Max days per year must be a number' })
  @Min(0, { message: 'Max days per year cannot be negative' })
  @Max(365, { message: 'Max days per year cannot exceed 365' })
  maxDaysPerYear: number;

  @Column({ type: 'boolean', default: true })
  @IsBoolean({ message: 'Requires approval must be a boolean' })
  requiresApproval: boolean;

  @Column({ type: 'boolean', default: false })
  @IsBoolean({ message: 'Can carry forward must be a boolean' })
  canCarryForward: boolean;

  @Column({ type: 'integer', default: 0 })
  @IsNumber({}, { message: 'Max carry forward days must be a number' })
  @Min(0, { message: 'Max carry forward days cannot be negative' })
  maxCarryForwardDays: number;

  @Column({ type: 'integer', default: 0 })
  @IsNumber({}, { message: 'Min advance notice days must be a number' })
  @Min(0, { message: 'Min advance notice days cannot be negative' })
  minAdvanceNoticeDays: number;

  @Column({ type: 'boolean', default: true })
  @IsBoolean({ message: 'Is active must be a boolean' })
  isActive: boolean;

  // Relationships
  @OneToMany(() => LeaveRequest, (request) => request.leaveType)
  leaveRequests: LeaveRequest[];

  @OneToMany(() => LeaveBalance, (balance) => balance.leaveType)
  leaveBalances: LeaveBalance[];
}
import { Entity, Column, ManyToOne, JoinColumn, Index, Check } from 'typeorm';
import { IsUUID, IsOptional, IsString, IsDate, IsIn, MaxLength } from 'class-validator';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { DailyAttendance } from './daily-attendance.entity';

/**
 * Attendance Request Entity - Tracks employee requests for attendance creation
 * Supports approval workflow and automatic attendance record generation
 * Includes validation for request time limits and business rule compliance
 */
@Entity('attendance_requests')
@Index('idx_attendance_request_user', ['userId'])
@Index('idx_attendance_request_date', ['requestedDate'])
@Index('idx_attendance_request_status', ['status'])
@Index('idx_attendance_request_approver', ['approverId'])
@Check('check_valid_status', '"status" IN (\'PENDING\', \'APPROVED\', \'REJECTED\')')
export class AttendanceRequest extends BaseEntity {
  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'UserId must be a valid UUID' })
  userId: string;

  @Column({ type: 'date' })
  @IsDate({ message: 'Requested date must be a valid date' })
  requestedDate: Date;

  @Column({ type: 'text' })
  @IsString({ message: 'Reason must be a string' })
  @MaxLength(1000, { message: 'Reason cannot exceed 1000 characters' })
  reason: string;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  @IsString({ message: 'Status must be a string' })
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'], { message: 'Status must be PENDING, APPROVED, or REJECTED' })
  status: 'PENDING' | 'APPROVED' | 'REJECTED';

  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID(4, { message: 'Approver ID must be a valid UUID' })
  approverId?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate({ message: 'Approval date must be a valid date' })
  approvalDate?: Date;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Approval notes must be a string' })
  @MaxLength(500, { message: 'Approval notes cannot exceed 500 characters' })
  approvalNotes?: string;

  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID(4, { message: 'Created attendance ID must be a valid UUID' })
  createdAttendanceId?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate({ message: 'Request deadline must be a valid date' })
  requestDeadline?: Date;

  // Relationships
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'approver_id' })
  approver?: User;

  @ManyToOne(() => DailyAttendance, { eager: false })
  @JoinColumn({ name: 'created_attendance_id' })
  createdAttendance?: DailyAttendance;
}
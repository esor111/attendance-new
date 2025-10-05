import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { IsUUID, IsOptional, IsNumber, IsBoolean, IsString, Min, Max, IsIn } from 'class-validator';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DailyAttendance } from './daily-attendance.entity';

/**
 * Attendance Session Entity - Tracks employee sessions during the day
 * Handles breaks, meetings, errands, and other temporary activities
 * Links to daily attendance record for session management
 */
@Entity('attendance_sessions')
@Index('idx_attendance_sessions_attendance', ['attendanceId'])
@Index('idx_attendance_sessions_type', ['sessionType'])
@Index('idx_attendance_sessions_flagged', ['isFlagged'])
export class AttendanceSession extends BaseEntity {
  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'AttendanceId must be a valid UUID' })
  attendanceId: string;

  @Column({ type: 'timestamp with time zone' })
  checkInTime: Date;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  @IsNumber({}, { message: 'Check-in latitude must be a valid number' })
  @Min(-90, { message: 'Check-in latitude must be between -90 and 90 degrees' })
  @Max(90, { message: 'Check-in latitude must be between -90 and 90 degrees' })
  checkInLatitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  @IsNumber({}, { message: 'Check-in longitude must be a valid number' })
  @Min(-180, { message: 'Check-in longitude must be between -180 and 180 degrees' })
  @Max(180, { message: 'Check-in longitude must be between -180 and 180 degrees' })
  checkInLongitude: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  checkOutTime?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Check-out latitude must be a valid number' })
  @Min(-90, { message: 'Check-out latitude must be between -90 and 90 degrees' })
  @Max(90, { message: 'Check-out latitude must be between -90 and 90 degrees' })
  checkOutLatitude?: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Check-out longitude must be a valid number' })
  @Min(-180, { message: 'Check-out longitude must be between -180 and 180 degrees' })
  @Max(180, { message: 'Check-out longitude must be between -180 and 180 degrees' })
  checkOutLongitude?: number;

  @Column({ type: 'boolean' })
  @IsBoolean({ message: 'isWithinRadius must be a boolean value' })
  isWithinRadius: boolean;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Travel speed must be a valid number' })
  @Min(0, { message: 'Travel speed cannot be negative' })
  travelSpeedKmph?: number;

  @Column({ type: 'boolean', default: false })
  @IsBoolean({ message: 'isFlagged must be a boolean value' })
  isFlagged: boolean;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Flag reason must be a string' })
  flagReason?: string;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Session duration must be a valid number' })
  @Min(0, { message: 'Session duration cannot be negative' })
  sessionDurationMinutes?: number;

  @Column({ type: 'varchar', length: 50, default: 'work' })
  @IsString({ message: 'Session type must be a string' })
  @IsIn(['work', 'break', 'lunch', 'meeting', 'errand'], {
    message: 'Session type must be one of: work, break, lunch, meeting, errand'
  })
  sessionType: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;

  // Relationships
  @ManyToOne(() => DailyAttendance, (attendance) => attendance.attendanceSessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attendance_id' })
  attendance: DailyAttendance;
}
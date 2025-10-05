import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Unique, Index } from 'typeorm';
import { IsUUID, IsOptional, IsNumber, IsBoolean, IsString, Min, Max } from 'class-validator';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { Entity as BusinessEntity } from '../../entity/entities/entity.entity';
import { AttendanceSession } from './attendance-session.entity';
import { LocationLog } from './location-log.entity';

/**
 * Daily Attendance Entity - Tracks employee daily attendance with clock-in/out
 * Includes geospatial data, fraud detection flags, and work hour calculations
 * Enforces one attendance record per user per date
 */
@Entity('daily_attendance')
@Unique('unique_user_date', ['userId', 'date'])
@Index('idx_daily_attendance_user_date', ['userId', 'date'])
@Index('idx_daily_attendance_entity', ['entityId'])
@Index('idx_daily_attendance_flagged', ['isFlagged'])
export class DailyAttendance extends BaseEntity {
  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'UserId must be a valid UUID' })
  userId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  clockInTime?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Clock-in latitude must be a valid number' })
  @Min(-90, { message: 'Clock-in latitude must be between -90 and 90 degrees' })
  @Max(90, { message: 'Clock-in latitude must be between -90 and 90 degrees' })
  clockInLatitude?: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Clock-in longitude must be a valid number' })
  @Min(-180, { message: 'Clock-in longitude must be between -180 and 180 degrees' })
  @Max(180, { message: 'Clock-in longitude must be between -180 and 180 degrees' })
  clockInLongitude?: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  clockOutTime?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Clock-out latitude must be a valid number' })
  @Min(-90, { message: 'Clock-out latitude must be between -90 and 90 degrees' })
  @Max(90, { message: 'Clock-out latitude must be between -90 and 90 degrees' })
  clockOutLatitude?: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Clock-out longitude must be a valid number' })
  @Min(-180, { message: 'Clock-out longitude must be between -180 and 180 degrees' })
  @Max(180, { message: 'Clock-out longitude must be between -180 and 180 degrees' })
  clockOutLongitude?: number;

  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID(4, { message: 'EntityId must be a valid UUID' })
  entityId?: string;

  @Column({ type: 'boolean', nullable: true })
  @IsOptional()
  @IsBoolean({ message: 'isWithinRadius must be a boolean value' })
  isWithinRadius?: boolean;

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

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Total hours must be a valid number' })
  @Min(0, { message: 'Total hours cannot be negative' })
  @Max(24, { message: 'Total hours cannot exceed 24 hours' })
  totalHours?: number;

  @Column({ type: 'varchar', length: 20, default: 'Present' })
  @IsString({ message: 'Status must be a string' })
  status: string; // Present, Absent, Late, etc.

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;

  // Relationships
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => BusinessEntity, { eager: false })
  @JoinColumn({ name: 'entity_id' })
  entity: BusinessEntity;

  @OneToMany(() => AttendanceSession, (session) => session.attendance, { cascade: ['remove'] })
  attendanceSessions: AttendanceSession[];

  @OneToMany(() => LocationLog, (log) => log.attendance, { cascade: ['remove'] })
  locationLogs: LocationLog[];
}
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { IsUUID, IsOptional, IsNumber, IsBoolean, IsString, Min, Max } from 'class-validator';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DailyAttendance } from './daily-attendance.entity';
import { Entity as BusinessEntity } from '../../entity/entities/entity.entity';

/**
 * Location Log Entity - Tracks field worker visits to client sites
 * Records check-in/out at various business entities during the workday
 * Links to daily attendance for comprehensive tracking
 */
@Entity('location_logs')
@Index('idx_location_logs_attendance', ['attendanceId'])
@Index('idx_location_logs_entity', ['entityId'])
@Index('idx_location_logs_flagged', ['isFlagged'])
export class LocationLog extends BaseEntity {
  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'AttendanceId must be a valid UUID' })
  attendanceId: string;

  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'EntityId must be a valid UUID' })
  entityId: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString({ message: 'Place name must be a string' })
  placeName: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  checkInTime?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Check-in latitude must be a valid number' })
  @Min(-90, { message: 'Check-in latitude must be between -90 and 90 degrees' })
  @Max(90, { message: 'Check-in latitude must be between -90 and 90 degrees' })
  checkInLatitude?: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Check-in longitude must be a valid number' })
  @Min(-180, { message: 'Check-in longitude must be between -180 and 180 degrees' })
  @Max(180, { message: 'Check-in longitude must be between -180 and 180 degrees' })
  checkInLongitude?: number;

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

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Visit duration must be a valid number' })
  @Min(0, { message: 'Visit duration cannot be negative' })
  visitDurationMinutes?: number;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Purpose must be a string' })
  purpose?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;

  // Relationships
  @ManyToOne(() => DailyAttendance, (attendance) => attendance.locationLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attendance_id' })
  attendance: DailyAttendance;

  @ManyToOne(() => BusinessEntity, { eager: false })
  @JoinColumn({ name: 'entity_id' })
  entity: BusinessEntity;
}
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { IsUUID, IsOptional, IsString, IsDateString, IsIn, MaxLength } from 'class-validator';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

/**
 * Remote Work Request Entity - Tracks employee requests for remote work
 * Includes approval workflow, location details, and business justification
 * Supports manager approval process and policy compliance
 */
@Entity('remote_work_requests')
@Index('idx_remote_work_user_date', ['userId', 'requestedDate'])
@Index('idx_remote_work_status', ['status'])
@Index('idx_remote_work_approver', ['approverId'])
export class RemoteWorkRequest extends BaseEntity {
  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'UserId must be a valid UUID' })
  userId: string;

  @Column({ type: 'date' })
  @IsDateString({}, { message: 'Requested date must be a valid date' })
  requestedDate: Date;

  @Column({ type: 'varchar', length: 500 })
  @IsString({ message: 'Reason must be a string' })
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString({ message: 'Remote location must be a string' })
  @MaxLength(255, { message: 'Remote location cannot exceed 255 characters' })
  remoteLocation: string;

  @Column({ 
    type: 'enum', 
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], 
    default: 'PENDING' 
  })
  @IsIn(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], { 
    message: 'Status must be one of: PENDING, APPROVED, REJECTED, CANCELLED' 
  })
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID(4, { message: 'Approver ID must be a valid UUID' })
  approverId?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  approvedAt?: Date;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Approval notes must be a string' })
  approvalNotes?: string;

  @Column({ type: 'timestamp with time zone' })
  requestedAt: Date;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Additional notes must be a string' })
  notes?: string;

  // Relationships
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'approver_id' })
  approver?: User;
}
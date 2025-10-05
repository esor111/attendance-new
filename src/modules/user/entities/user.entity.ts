import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { IsEmail, IsPhoneNumber, IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Department } from '../../department/entities/department.entity';

/**
 * User Entity - Represents system users with external microservice integration
 * Extends BaseEntity for consistent UUID and timestamp management
 * Supports handshake process with external User Microservice
 */
@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  @IsString()
  @Length(1, 255, { message: 'Name must be between 1 and 255 characters' })
  name: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  @IsString()
  @Length(1, 20, { message: 'Phone must be between 1 and 20 characters' })
  phone: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @Length(1, 255, { message: 'Email must be between 1 and 255 characters' })
  email: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 255, { message: 'UserId must be between 1 and 255 characters' })
  userId?: string; // External microservice ID for handshake process

  @Column({ type: 'boolean', default: false })
  @IsBoolean({ message: 'isFieldWorker must be a boolean value' })
  isFieldWorker: boolean;

  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  lastSyncedAt?: Date; // Tracks when data was last synced from external service
}
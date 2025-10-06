import { Entity, Column, ManyToOne, JoinColumn, Index, Check } from 'typeorm';
import { IsString, IsBoolean, IsArray, IsOptional, MaxLength, Min, Max } from 'class-validator';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Department } from './department.entity';

/**
 * Department Schedule Entity - Defines working hours and days for departments
 * Simple department-level schedule management (e.g., Marketing: 10-5 Sun-Fri, Tech: 9-6 Mon-Fri)
 * Users inherit their department's schedule automatically
 */
@Entity('department_schedules')
@Index('idx_department_schedule_dept', ['departmentId'])
@Index('idx_department_schedule_active', ['isActive'])
@Check('check_valid_time_range', '"endTime" > "startTime"')
export class DepartmentSchedule extends BaseEntity {
  @Column({ type: 'uuid' })
  departmentId: string;

  @Column({ type: 'varchar', length: 100 })
  @IsString({ message: 'Name must be a string' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name: string; // "Regular Hours", "Standard Schedule"

  @Column({ type: 'time' })
  @IsString({ message: 'Start time must be a valid time string' })
  startTime: string; // "09:00:00"

  @Column({ type: 'time' })
  @IsString({ message: 'End time must be a valid time string' })
  endTime: string; // "18:00:00"

  @Column({ type: 'json' })
  @IsArray({ message: 'Work days must be an array' })
  workDays: number[]; // [0,1,2,3,4,5,6] where 0=Sunday, 1=Monday, etc.

  @Column({ type: 'boolean', default: true })
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  // Relationships
  @ManyToOne(() => Department, { eager: false })
  @JoinColumn({ name: 'department_id' })
  department: Department;
}
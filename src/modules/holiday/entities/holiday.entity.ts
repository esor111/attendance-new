import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { IsString, IsDateString, IsEnum, IsOptional, IsBoolean, Length } from 'class-validator';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Department } from '../../department/entities/department.entity';

export enum HolidayType {
  NATIONAL = 'NATIONAL',
  COMPANY = 'COMPANY',
  DEPARTMENT = 'DEPARTMENT',
}

export enum RecurrenceType {
  NONE = 'NONE',
  YEARLY = 'YEARLY',
  MONTHLY = 'MONTHLY',
}

/**
 * Holiday Entity - Represents holidays that affect attendance operations
 * Supports different types (national, company, department) and recurrence patterns
 * Used to validate attendance operations and exclude holidays from calculations
 */
@Entity('holidays')
@Index('idx_holiday_date', ['date'])
@Index('idx_holiday_type', ['type'])
@Index('idx_holiday_department', ['departmentId'])
export class Holiday extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  @IsString({ message: 'Holiday name must be a string' })
  @Length(1, 100, { message: 'Holiday name must be between 1 and 100 characters' })
  name: string;

  @Column({ type: 'date' })
  @IsDateString({}, { message: 'Date must be a valid date string' })
  date: Date;

  @Column({
    type: 'enum',
    enum: HolidayType,
    default: HolidayType.COMPANY,
  })
  @IsEnum(HolidayType, { message: 'Type must be NATIONAL, COMPANY, or DEPARTMENT' })
  type: HolidayType;

  @Column({
    type: 'enum',
    enum: RecurrenceType,
    default: RecurrenceType.NONE,
  })
  @IsEnum(RecurrenceType, { message: 'Recurrence must be NONE, YEARLY, or MONTHLY' })
  recurrence: RecurrenceType;

  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  departmentId?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @Column({ type: 'boolean', default: true })
  @IsBoolean({ message: 'Is active must be a boolean' })
  isActive: boolean;

  // Relationships
  @ManyToOne(() => Department, { eager: false, nullable: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department;
}
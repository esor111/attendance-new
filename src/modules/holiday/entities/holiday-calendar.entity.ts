import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { IsNumber, IsUUID, IsOptional, Min, Max } from 'class-validator';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Holiday } from './holiday.entity';
import { Department } from '../../department/entities/department.entity';

/**
 * Holiday Calendar Entity - Associates holidays with specific years and departments
 * Enables automatic calendar generation and department-specific holiday management
 * Supports yearly calendar views and department-based holiday filtering
 */
@Entity('holiday_calendars')
@Index('idx_holiday_calendar_year', ['year'])
@Index('idx_holiday_calendar_department', ['departmentId'])
@Unique('unique_holiday_year_department', ['holidayId', 'year', 'departmentId'])
export class HolidayCalendar extends BaseEntity {
  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'Holiday ID must be a valid UUID' })
  holidayId: string;

  @Column({ type: 'integer' })
  @IsNumber({}, { message: 'Year must be a number' })
  @Min(2020, { message: 'Year must be 2020 or later' })
  @Max(2100, { message: 'Year must be 2100 or earlier' })
  year: number;

  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID(4, { message: 'Department ID must be a valid UUID' })
  departmentId?: string;

  @Column({ type: 'date' })
  actualDate: Date;

  // Relationships
  @ManyToOne(() => Holiday, (holiday) => holiday.holidayCalendars, { eager: false })
  @JoinColumn({ name: 'holiday_id' })
  holiday: Holiday;

  @ManyToOne(() => Department, { eager: false, nullable: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department;
}
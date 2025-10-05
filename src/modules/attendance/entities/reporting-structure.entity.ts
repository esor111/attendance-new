import { Entity, Column, ManyToOne, JoinColumn, Index, Check } from 'typeorm';
import { IsUUID, IsOptional, IsDate } from 'class-validator';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

/**
 * Reporting Structure Entity - Defines employee-manager relationships
 * Supports time-bound relationships with start and end dates
 * Prevents circular reporting relationships through validation
 */
@Entity('reporting_structure')
@Index('idx_reporting_structure_employee', ['employeeId'])
@Index('idx_reporting_structure_manager', ['managerId'])
@Index('idx_reporting_structure_dates', ['startDate', 'endDate'])
@Check('check_different_users', '"employeeId" != "managerId"')
@Check('check_valid_date_range', '"endDate" IS NULL OR "endDate" >= "startDate"')
export class ReportingStructure extends BaseEntity {
  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'EmployeeId must be a valid UUID' })
  employeeId: string;

  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'ManagerId must be a valid UUID' })
  managerId: string;

  @Column({ type: 'date' })
  @IsDate({ message: 'Start date must be a valid date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  @IsOptional()
  @IsDate({ message: 'End date must be a valid date' })
  endDate?: Date;

  // Relationships
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'employee_id' })
  employee: User;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'manager_id' })
  manager: User;
}
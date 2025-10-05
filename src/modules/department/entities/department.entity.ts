import { Entity, Column, OneToMany, Unique } from 'typeorm';
import { IsString, Length, IsUUID } from 'class-validator';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { DepartmentEntityAssignment } from './department-entity-assignment.entity';

/**
 * Department Entity - Represents organizational departments within businesses
 * Extends BaseEntity for consistent UUID and timestamp management
 * Enforces unique department names within each business
 */
@Entity('departments')
@Unique('unique_department_name_per_business', ['name', 'businessId'])
export class Department extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  @IsString()
  @Length(1, 100, { message: 'Department name must be between 1 and 100 characters' })
  name: string;

  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'BusinessId must be a valid UUID' })
  businessId: string; // Reference to business from external microservice

  @OneToMany(() => User, (user) => user.department)
  users: User[];

  @OneToMany(
    () => DepartmentEntityAssignment,
    (assignment) => assignment.department,
  )
  entityAssignments: DepartmentEntityAssignment[];
}
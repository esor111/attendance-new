import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Department } from './department.entity';
import { Entity as BusinessEntity } from '../../entity/entities/entity.entity';

/**
 * Department-Entity Assignment - Links departments to business entities
 * Manages which entities (locations) each department can access
 * Supports primary entity designation (one per department)
 */
@Entity('department_entity_assignments')
@Unique(['departmentId', 'entityId']) // Prevent duplicate assignments
export class DepartmentEntityAssignment extends BaseEntity {
  @Column({ type: 'uuid' })
  departmentId: string;

  @Column({ type: 'uuid' })
  entityId: string;

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean; // Only one primary entity per department

  @ManyToOne(() => Department, (department) => department.entityAssignments)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ManyToOne(() => BusinessEntity, (entity) => entity.departmentAssignments)
  @JoinColumn({ name: 'entity_id' })
  entity: BusinessEntity;
}
import { Entity, Column, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { IsUUID, IsBoolean } from 'class-validator';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { Entity as BusinessEntity } from '../../entity/entities/entity.entity';

/**
 * User Entity Assignment - Direct assignment of entities to individual users
 * Overrides department-based assignments for specific access control
 * Supports primary entity designation for user's main work location
 */
@Entity('user_entity_assignments')
@Unique('unique_user_entity', ['userId', 'entityId'])
@Index('idx_user_entity_assignments_user', ['userId'])
@Index('idx_user_entity_assignments_entity', ['entityId'])
@Index('idx_user_entity_assignments_primary', ['isPrimary'])
export class UserEntityAssignment extends BaseEntity {
  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'UserId must be a valid UUID' })
  userId: string;

  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'EntityId must be a valid UUID' })
  entityId: string;

  @Column({ type: 'boolean', default: false })
  @IsBoolean({ message: 'isPrimary must be a boolean value' })
  isPrimary: boolean;

  // Relationships
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => BusinessEntity, { eager: false })
  @JoinColumn({ name: 'entity_id' })
  entity: BusinessEntity;
}
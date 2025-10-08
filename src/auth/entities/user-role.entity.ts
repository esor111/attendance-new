import { Entity, Column, ManyToOne, JoinColumn, Index, Check } from 'typeorm';
import { IsUUID, IsOptional, IsBoolean, IsDate } from 'class-validator';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../modules/user/entities/user.entity';
import { Role } from './role.entity';
import { Entity as BusinessEntity } from '../../modules/entity/entities/entity.entity';

/**
 * UserRole Entity - Assigns roles to users with entity scoping
 * Supports time-bound role assignments and entity-specific roles
 */
@Entity('user_roles')
@Index('idx_user_roles_user', ['userId'])
@Index('idx_user_roles_role', ['roleId'])
@Index('idx_user_roles_entity', ['entityId'])
@Index('idx_user_roles_active', ['isActive'])
@Index('idx_user_roles_dates', ['assignedAt', 'expiresAt'])
@Check('check_valid_expiration', '"expiresAt" IS NULL OR "expiresAt" > "assignedAt"')
export class UserRole extends BaseEntity {
  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  userId: string;

  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'Role ID must be a valid UUID' })
  roleId: string;

  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID(4, { message: 'Entity ID must be a valid UUID' })
  entityId?: string; // Scope role to specific entity (optional)

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  @IsDate({ message: 'Assigned at must be a valid date' })
  assignedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID(4, { message: 'Assigned by must be a valid UUID' })
  assignedBy?: string; // Who assigned this role

  @Column({ type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate({ message: 'Expires at must be a valid date' })
  expiresAt?: Date; // null = permanent assignment

  @Column({ type: 'boolean', default: true })
  @IsBoolean({ message: 'Is active must be a boolean' })
  isActive: boolean;

  // Relationships
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Role, role => role.userRoles, { eager: false })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => BusinessEntity, { eager: false, nullable: true })
  @JoinColumn({ name: 'entity_id' })
  entity?: BusinessEntity;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'assigned_by' })
  assignedByUser?: User;

  /**
   * Check if this role assignment is currently active
   */
  isCurrentlyActive(): boolean {
    if (!this.isActive) return false;
    
    const now = new Date();
    
    // Check if assignment has started
    if (this.assignedAt > now) return false;
    
    // Check if assignment has expired
    if (this.expiresAt && this.expiresAt <= now) return false;
    
    return true;
  }

  /**
   * Check if role assignment is valid for a specific entity
   */
  isValidForEntity(entityId?: string): boolean {
    if (!this.isCurrentlyActive()) return false;
    
    // If no entity specified in assignment, it's global
    if (!this.entityId) return true;
    
    // If entity specified, it must match
    return this.entityId === entityId;
  }

  /**
   * Get remaining time until expiration
   */
  getTimeUntilExpiration(): number | null {
    if (!this.expiresAt) return null; // Permanent
    
    const now = new Date();
    return this.expiresAt.getTime() - now.getTime();
  }

  /**
   * Check if role assignment is expiring soon (within days)
   */
  isExpiringSoon(days: number = 7): boolean {
    const timeUntilExpiration = this.getTimeUntilExpiration();
    if (timeUntilExpiration === null) return false; // Permanent
    
    const daysInMs = days * 24 * 60 * 60 * 1000;
    return timeUntilExpiration <= daysInMs && timeUntilExpiration > 0;
  }
}
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { IsUUID, IsOptional, IsBoolean, IsDate } from 'class-validator';
import { BaseEntity } from '../../common/entities/base.entity';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { Entity as BusinessEntity } from '../../modules/entity/entities/entity.entity';
import { User } from '../../modules/user/entities/user.entity';

/**
 * EntityRolePermission Entity - Entity-specific role permissions
 * Allows same role to have different permissions in different entities
 * This is the KEY table for entity-scoped permissions
 */
@Entity('entity_role_permissions')
@Index('idx_entity_role_permissions_entity', ['entityId'])
@Index('idx_entity_role_permissions_role', ['roleId'])
@Index('idx_entity_role_permissions_permission', ['permissionId'])
@Index('idx_entity_role_permissions_granted', ['isGranted'])
@Index('idx_entity_role_permissions_composite', ['entityId', 'roleId', 'permissionId'])
export class EntityRolePermission extends BaseEntity {
  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'Entity ID must be a valid UUID' })
  entityId: string;

  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'Role ID must be a valid UUID' })
  roleId: string;

  @Column({ type: 'uuid' })
  @IsUUID(4, { message: 'Permission ID must be a valid UUID' })
  permissionId: string;

  @Column({ type: 'boolean', default: true })
  @IsBoolean({ message: 'Is granted must be a boolean' })
  isGranted: boolean; // true = granted, false = explicitly denied

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  @IsDate({ message: 'Granted at must be a valid date' })
  grantedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID(4, { message: 'Granted by must be a valid UUID' })
  grantedBy?: string; // Who granted/denied this permission

  // Relationships
  @ManyToOne(() => BusinessEntity, { eager: false })
  @JoinColumn({ name: 'entity_id' })
  entity: BusinessEntity;

  @ManyToOne(() => Role, { eager: false })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Permission, { eager: false })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'granted_by' })
  grantedByUser?: User;

  /**
   * Check if this is an active permission grant
   */
  isActiveGrant(): boolean {
    return this.isGranted && this.permission?.isActive !== false;
  }

  /**
   * Check if this is an explicit denial
   */
  isExplicitDenial(): boolean {
    return !this.isGranted;
  }

  /**
   * Get permission context as string
   */
  getContextString(): string {
    const entityName = this.entity?.name || 'Unknown Entity';
    const roleName = this.role?.name || 'Unknown Role';
    const permissionName = this.permission?.name || 'Unknown Permission';
    const status = this.isGranted ? 'GRANTED' : 'DENIED';
    
    return `${entityName} | ${roleName} | ${permissionName} | ${status}`;
  }

  /**
   * Check if permission matches criteria
   */
  matchesPermission(resource: string, action: string, scope?: string): boolean {
    if (!this.permission || !this.isActiveGrant()) return false;
    
    return this.permission.matches(resource, action, scope);
  }

  /**
   * Static method to create permission key for caching
   */
  static createCacheKey(entityId: string, roleId: string, permissionId: string): string {
    return `entity_role_perm:${entityId}:${roleId}:${permissionId}`;
  }
}
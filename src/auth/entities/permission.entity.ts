import { Entity, Column, OneToMany, Index } from 'typeorm';
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { BaseEntity } from '../../common/entities/base.entity';
import { RolePermission } from './role-permission.entity';

/**
 * Permission Entity - Defines specific permissions in the system
 * Uses resource:action:scope pattern for granular control
 */
@Entity('permissions')
@Index('idx_permission_name', ['name'])
@Index('idx_permission_resource_action', ['resource', 'action'])
@Index('idx_permission_scope', ['scope'])
export class Permission extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  @IsString({ message: 'Permission name must be a string' })
  @MaxLength(100, { message: 'Permission name cannot exceed 100 characters' })
  name: string; // e.g., 'REQUEST:APPROVE:TEAM'

  @Column({ type: 'varchar', length: 150 })
  @IsString({ message: 'Display name must be a string' })
  @MaxLength(150, { message: 'Display name cannot exceed 150 characters' })
  displayName: string; // e.g., 'Approve Team Requests'

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @Column({ type: 'varchar', length: 50 })
  @IsString({ message: 'Resource must be a string' })
  @MaxLength(50, { message: 'Resource cannot exceed 50 characters' })
  resource: string; // e.g., 'REQUEST', 'USER', 'REPORT', 'ATTENDANCE'

  @Column({ type: 'varchar', length: 50 })
  @IsString({ message: 'Action must be a string' })
  @MaxLength(50, { message: 'Action cannot exceed 50 characters' })
  action: string; // e.g., 'CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'

  @Column({ type: 'varchar', length: 50 })
  @IsString({ message: 'Scope must be a string' })
  @MaxLength(50, { message: 'Scope cannot exceed 50 characters' })
  scope: string; // e.g., 'OWN', 'TEAM', 'DEPARTMENT', 'ALL'

  @Column({ type: 'boolean', default: true })
  @IsBoolean({ message: 'Is active must be a boolean' })
  isActive: boolean;

  // Relationships
  @OneToMany(() => RolePermission, rolePermission => rolePermission.permission)
  rolePermissions: RolePermission[];

  /**
   * Generate permission name from components
   */
  static generateName(resource: string, action: string, scope: string): string {
    return `${resource.toUpperCase()}:${action.toUpperCase()}:${scope.toUpperCase()}`;
  }

  /**
   * Parse permission name into components
   */
  static parseName(name: string): { resource: string; action: string; scope: string } | null {
    const parts = name.split(':');
    if (parts.length !== 3) return null;
    
    return {
      resource: parts[0],
      action: parts[1],
      scope: parts[2]
    };
  }

  /**
   * Check if this permission matches the given criteria
   */
  matches(resource: string, action: string, scope?: string): boolean {
    const resourceMatch = this.resource.toUpperCase() === resource.toUpperCase();
    const actionMatch = this.action.toUpperCase() === action.toUpperCase();
    const scopeMatch = !scope || 
      this.scope.toUpperCase() === scope.toUpperCase() || 
      this.scope.toUpperCase() === 'ALL';
    
    return resourceMatch && actionMatch && scopeMatch;
  }
}
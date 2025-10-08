import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { IsUUID, IsOptional, IsBoolean, IsDate } from 'class-validator';
import { BaseEntity } from '../../common/entities/base.entity';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { User } from '../../modules/user/entities/user.entity';

/**
 * RolePermission Entity - Assigns permissions to roles
 * Supports both granting and explicit denial of permissions
 */
@Entity('role_permissions')
@Index('idx_role_permissions_role', ['roleId'])
@Index('idx_role_permissions_permission', ['permissionId'])
@Index('idx_role_permissions_granted', ['isGranted'])
export class RolePermission extends BaseEntity {
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
  @ManyToOne(() => Role, role => role.rolePermissions, { eager: false })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Permission, permission => permission.rolePermissions, { eager: false })
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
   * Get permission details as string
   */
  getPermissionString(): string {
    if (!this.permission) return 'Unknown Permission';
    
    return `${this.permission.resource}:${this.permission.action}:${this.permission.scope}`;
  }

  /**
   * Get grant/deny status as string
   */
  getStatusString(): string {
    return this.isGranted ? 'GRANTED' : 'DENIED';
  }
}
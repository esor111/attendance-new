import { Entity, Column, OneToMany, Index } from 'typeorm';
import { IsString, IsOptional, IsBoolean, IsNumber, MaxLength } from 'class-validator';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserRole } from './user-role.entity';
import { RolePermission } from './role-permission.entity';

/**
 * Role Entity - Defines user roles in the system
 * Supports hierarchical roles with levels and system vs custom roles
 */
@Entity('roles')
@Index('idx_role_name', ['name'])
@Index('idx_role_level', ['level'])
export class Role extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  @IsString({ message: 'Role name must be a string' })
  @MaxLength(50, { message: 'Role name cannot exceed 50 characters' })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  @IsString({ message: 'Display name must be a string' })
  @MaxLength(100, { message: 'Display name cannot exceed 100 characters' })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @Column({ type: 'integer', default: 5 })
  @IsNumber({}, { message: 'Level must be a number' })
  level: number; // 1=highest (SUPER_ADMIN), 5=lowest (EMPLOYEE)

  @Column({ type: 'boolean', default: false })
  @IsBoolean({ message: 'Is system role must be a boolean' })
  isSystemRole: boolean; // System roles vs custom roles

  @Column({ type: 'boolean', default: true })
  @IsBoolean({ message: 'Is active must be a boolean' })
  isActive: boolean;

  // Relationships
  @OneToMany(() => UserRole, userRole => userRole.role)
  userRoles: UserRole[];

  @OneToMany(() => RolePermission, rolePermission => rolePermission.role)
  rolePermissions: RolePermission[];

  /**
   * Helper method to check if role has specific permission
   */
  async hasPermission(permissionName: string): Promise<boolean> {
    if (!this.rolePermissions) return false;
    
    return this.rolePermissions.some(rp => 
      rp.permission?.name === permissionName && rp.isGranted
    );
  }

  /**
   * Get all granted permissions for this role
   */
  getGrantedPermissions(): string[] {
    if (!this.rolePermissions) return [];
    
    return this.rolePermissions
      .filter(rp => rp.isGranted && rp.permission?.isActive)
      .map(rp => rp.permission.name);
  }
}
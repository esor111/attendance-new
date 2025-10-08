import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { UserRole } from '../entities/user-role.entity';
import { RolePermission } from '../entities/role-permission.entity';

/**
 * RoleService - Manages roles and role assignments
 * Handles CRUD operations for roles and role-permission mappings
 */
@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  /**
   * Create a new role
   */
  async createRole(
    name: string,
    displayName: string,
    description?: string,
    level: number = 5,
    isSystemRole: boolean = false,
  ): Promise<Role> {
    // Check if role already exists
    const existingRole = await this.roleRepository.findOne({
      where: { name: name.toUpperCase() },
    });

    if (existingRole) {
      throw new ConflictException(`Role '${name}' already exists`);
    }

    const role = this.roleRepository.create({
      name: name.toUpperCase(),
      displayName,
      description,
      level,
      isSystemRole,
      isActive: true,
    });

    const savedRole = await this.roleRepository.save(role);
    this.logger.log(`Created role: ${savedRole.name}`);
    
    return savedRole;
  }

  /**
   * Get all roles
   */
  async getAllRoles(includeInactive: boolean = false): Promise<Role[]> {
    const query = this.roleRepository.createQueryBuilder('role');
    
    if (!includeInactive) {
      query.where('role.isActive = true');
    }
    
    return await query
      .orderBy('role.level', 'ASC')
      .addOrderBy('role.name', 'ASC')
      .getMany();
  }

  /**
   * Get role by name
   */
  async getRoleByName(name: string): Promise<Role | null> {
    return await this.roleRepository.findOne({
      where: { name: name.toUpperCase(), isActive: true },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
  }

  /**
   * Get role by ID
   */
  async getRoleById(id: string): Promise<Role | null> {
    return await this.roleRepository.findOne({
      where: { id, isActive: true },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
  }

  /**
   * Update role
   */
  async updateRole(
    id: string,
    updates: Partial<Pick<Role, 'displayName' | 'description' | 'level' | 'isActive'>>,
  ): Promise<Role> {
    const role = await this.getRoleById(id);
    
    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }

    if (role.isSystemRole && updates.isActive === false) {
      throw new ConflictException('Cannot deactivate system roles');
    }

    Object.assign(role, updates);
    const updatedRole = await this.roleRepository.save(role);
    
    this.logger.log(`Updated role: ${updatedRole.name}`);
    return updatedRole;
  }

  /**
   * Assign permission to role (global)
   */
  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
    grantedBy?: string,
  ): Promise<RolePermission> {
    // Verify role exists
    const role = await this.getRoleById(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID '${roleId}' not found`);
    }

    // Verify permission exists
    const permission = await this.permissionRepository.findOne({
      where: { id: permissionId, isActive: true },
    });
    if (!permission) {
      throw new NotFoundException(`Permission with ID '${permissionId}' not found`);
    }

    // Check if already assigned
    let rolePermission = await this.rolePermissionRepository.findOne({
      where: { roleId, permissionId },
    });

    if (rolePermission) {
      // Update existing
      rolePermission.isGranted = true;
      rolePermission.grantedAt = new Date();
      rolePermission.grantedBy = grantedBy;
    } else {
      // Create new
      rolePermission = this.rolePermissionRepository.create({
        roleId,
        permissionId,
        isGranted: true,
        grantedBy,
      });
    }

    const savedRolePermission = await this.rolePermissionRepository.save(rolePermission);
    
    this.logger.log(`Assigned permission '${permission.name}' to role '${role.name}'`);
    return savedRolePermission;
  }

  /**
   * Remove permission from role
   */
  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    const result = await this.rolePermissionRepository.delete({
      roleId,
      permissionId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Role-permission assignment not found');
    }

    this.logger.log(`Removed permission from role`);
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(
    userId: string,
    roleId: string,
    entityId?: string,
    assignedBy?: string,
    expiresAt?: Date,
  ): Promise<UserRole> {
    // Verify role exists
    const role = await this.getRoleById(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID '${roleId}' not found`);
    }

    // Check if already assigned
    let userRole = await this.userRoleRepository.findOne({
      where: { userId, roleId, entityId: entityId || undefined },
    });

    if (userRole) {
      // Update existing
      userRole.isActive = true;
      userRole.assignedAt = new Date();
      userRole.assignedBy = assignedBy;
      userRole.expiresAt = expiresAt;
    } else {
      // Create new
      userRole = this.userRoleRepository.create({
        userId,
        roleId,
        entityId,
        assignedBy,
        expiresAt,
        isActive: true,
      });
    }

    const savedUserRole = await this.userRoleRepository.save(userRole);
    
    this.logger.log(`Assigned role '${role.name}' to user ${userId}${entityId ? ` in entity ${entityId}` : ''}`);
    return savedUserRole;
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(
    userId: string,
    roleId: string,
    entityId?: string,
  ): Promise<void> {
    const result = await this.userRoleRepository.delete({
      userId,
      roleId,
      entityId: entityId || undefined,
    });

    if (result.affected === 0) {
      throw new NotFoundException('User role assignment not found');
    }

    this.logger.log(`Removed role from user ${userId}`);
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string, entityId?: string): Promise<UserRole[]> {
    const query = this.userRoleRepository
      .createQueryBuilder('ur')
      .leftJoinAndSelect('ur.role', 'role')
      .leftJoinAndSelect('ur.entity', 'entity')
      .where('ur.userId = :userId', { userId })
      .andWhere('ur.isActive = true')
      .andWhere('role.isActive = true');

    if (entityId) {
      query.andWhere('(ur.entityId = :entityId OR ur.entityId IS NULL)', { entityId });
    }

    const now = new Date();
    query
      .andWhere('ur.assignedAt <= :now', { now })
      .andWhere('(ur.expiresAt IS NULL OR ur.expiresAt > :now)', { now })
      .orderBy('ur.entityId', 'DESC') // Entity-specific first
      .addOrderBy('role.level', 'ASC'); // Higher level roles first

    return await query.getMany();
  }

  /**
   * Get role permissions
   */
  async getRolePermissions(roleId: string): Promise<RolePermission[]> {
    return await this.rolePermissionRepository.find({
      where: { roleId, isGranted: true },
      relations: ['permission'],
    });
  }

  /**
   * Check if user has role
   */
  async userHasRole(
    userId: string,
    roleName: string,
    entityId?: string,
  ): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId, entityId);
    return userRoles.some(ur => ur.role.name === roleName.toUpperCase());
  }

  /**
   * Get users with specific role
   */
  async getUsersWithRole(
    roleName: string,
    entityId?: string,
  ): Promise<UserRole[]> {
    const query = this.userRoleRepository
      .createQueryBuilder('ur')
      .leftJoinAndSelect('ur.role', 'role')
      .leftJoinAndSelect('ur.user', 'user')
      .leftJoinAndSelect('ur.entity', 'entity')
      .where('role.name = :roleName', { roleName: roleName.toUpperCase() })
      .andWhere('ur.isActive = true')
      .andWhere('role.isActive = true');

    if (entityId) {
      query.andWhere('ur.entityId = :entityId', { entityId });
    }

    const now = new Date();
    query
      .andWhere('ur.assignedAt <= :now', { now })
      .andWhere('(ur.expiresAt IS NULL OR ur.expiresAt > :now)', { now });

    return await query.getMany();
  }
}
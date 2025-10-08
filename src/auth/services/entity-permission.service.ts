import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserRole } from '../entities/user-role.entity';
import { EntityRolePermission } from '../entities/entity-role-permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';

/**
 * EntityPermissionService - Core service for entity-scoped permission checking
 * Handles the complex logic of determining user permissions in specific entity contexts
 */
@Injectable()
export class EntityPermissionService {
  private readonly logger = new Logger(EntityPermissionService.name);

  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(EntityRolePermission)
    private readonly entityRolePermissionRepository: Repository<EntityRolePermission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  /**
   * Check if user has specific permission in entity context
   * This is the MAIN method used by guards
   */
  async hasPermissionInEntity(
    userId: string,
    entityId: string,
    permissionName: string,
  ): Promise<boolean> {
    try {
      this.logger.debug(`Checking permission: ${userId} | ${entityId} | ${permissionName}`);

      // 1. Get user's active roles in this entity
      const userRoles = await this.getUserActiveRolesInEntity(userId, entityId);
      
      if (userRoles.length === 0) {
        this.logger.debug(`No active roles found for user ${userId} in entity ${entityId}`);
        return false;
      }

      // 2. Check entity-specific permissions first (highest priority)
      const hasEntityPermission = await this.checkEntitySpecificPermission(
        entityId,
        userRoles.map(ur => ur.roleId),
        permissionName,
      );

      if (hasEntityPermission !== null) {
        this.logger.debug(`Entity-specific permission result: ${hasEntityPermission}`);
        return hasEntityPermission;
      }

      // 3. Fallback to global role permissions
      const hasGlobalPermission = await this.checkGlobalRolePermission(
        userRoles.map(ur => ur.roleId),
        permissionName,
      );

      this.logger.debug(`Global permission result: ${hasGlobalPermission}`);
      return hasGlobalPermission;

    } catch (error) {
      this.logger.error(`Error checking permission: ${error.message}`, error.stack);
      return false; // Fail secure
    }
  }

  /**
   * Get all permissions for user in specific entity
   */
  async getUserPermissionsInEntity(
    userId: string,
    entityId: string,
  ): Promise<Permission[]> {
    try {
      // Get user's active roles in entity
      const userRoles = await this.getUserActiveRolesInEntity(userId, entityId);
      
      if (userRoles.length === 0) {
        return [];
      }

      const roleIds = userRoles.map(ur => ur.roleId);

      // Get entity-specific permissions
      const entityPermissions = await this.entityRolePermissionRepository
        .createQueryBuilder('erp')
        .leftJoinAndSelect('erp.permission', 'permission')
        .where('erp.entityId = :entityId', { entityId })
        .andWhere('erp.roleId IN (:...roleIds)', { roleIds })
        .andWhere('erp.isGranted = true')
        .andWhere('permission.isActive = true')
        .getMany();

      // Get global role permissions (fallback)
      const globalPermissions = await this.rolePermissionRepository
        .createQueryBuilder('rp')
        .leftJoinAndSelect('rp.permission', 'permission')
        .where('rp.roleId IN (:...roleIds)', { roleIds })
        .andWhere('rp.isGranted = true')
        .andWhere('permission.isActive = true')
        .getMany();

      // Combine and deduplicate permissions (entity-specific takes priority)
      const allPermissions = new Map<string, Permission>();

      // Add global permissions first
      globalPermissions.forEach(rp => {
        if (rp.permission) {
          allPermissions.set(rp.permission.id, rp.permission);
        }
      });

      // Override with entity-specific permissions
      entityPermissions.forEach(erp => {
        if (erp.permission) {
          allPermissions.set(erp.permission.id, erp.permission);
        }
      });

      return Array.from(allPermissions.values());

    } catch (error) {
      this.logger.error(`Error getting user permissions: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Check multiple permissions at once (for performance)
   */
  async hasAnyPermissionInEntity(
    userId: string,
    entityId: string,
    permissionNames: string[],
  ): Promise<{ [permission: string]: boolean }> {
    const result: { [permission: string]: boolean } = {};

    // Initialize all to false
    permissionNames.forEach(name => {
      result[name] = false;
    });

    try {
      const userPermissions = await this.getUserPermissionsInEntity(userId, entityId);
      const permissionMap = new Set(userPermissions.map(p => p.name));

      // Check each requested permission
      permissionNames.forEach(name => {
        result[name] = permissionMap.has(name);
      });

    } catch (error) {
      this.logger.error(`Error checking multiple permissions: ${error.message}`, error.stack);
    }

    return result;
  }

  /**
   * Get user's active roles in specific entity
   */
  private async getUserActiveRolesInEntity(
    userId: string,
    entityId: string,
  ): Promise<UserRole[]> {
    const now = new Date();

    return await this.userRoleRepository
      .createQueryBuilder('ur')
      .leftJoinAndSelect('ur.role', 'role')
      .where('ur.userId = :userId', { userId })
      .andWhere('(ur.entityId = :entityId OR ur.entityId IS NULL)', { entityId })
      .andWhere('ur.isActive = true')
      .andWhere('ur.assignedAt <= :now', { now })
      .andWhere('(ur.expiresAt IS NULL OR ur.expiresAt > :now)', { now })
      .andWhere('role.isActive = true')
      .orderBy('ur.entityId', 'DESC') // Entity-specific roles first
      .getMany();
  }

  /**
   * Check entity-specific permissions
   * Returns: true (granted), false (denied), null (not defined)
   */
  private async checkEntitySpecificPermission(
    entityId: string,
    roleIds: string[],
    permissionName: string,
  ): Promise<boolean | null> {
    const entityPermission = await this.entityRolePermissionRepository
      .createQueryBuilder('erp')
      .leftJoinAndSelect('erp.permission', 'permission')
      .where('erp.entityId = :entityId', { entityId })
      .andWhere('erp.roleId IN (:...roleIds)', { roleIds })
      .andWhere('permission.name = :permissionName', { permissionName })
      .andWhere('permission.isActive = true')
      .orderBy('erp.isGranted', 'DESC') // Granted permissions first
      .getOne();

    if (!entityPermission) {
      return null; // Not defined at entity level
    }

    return entityPermission.isGranted;
  }

  /**
   * Check global role permissions (fallback)
   */
  private async checkGlobalRolePermission(
    roleIds: string[],
    permissionName: string,
  ): Promise<boolean> {
    const rolePermission = await this.rolePermissionRepository
      .createQueryBuilder('rp')
      .leftJoinAndSelect('rp.permission', 'permission')
      .where('rp.roleId IN (:...roleIds)', { roleIds })
      .andWhere('permission.name = :permissionName', { permissionName })
      .andWhere('permission.isActive = true')
      .andWhere('rp.isGranted = true')
      .getOne();

    return !!rolePermission;
  }

  /**
   * Grant permission to role in specific entity
   */
  async grantEntityPermission(
    entityId: string,
    roleId: string,
    permissionName: string,
    grantedBy?: string,
  ): Promise<EntityRolePermission> {
    // Find permission by name
    const permission = await this.permissionRepository.findOne({
      where: { name: permissionName, isActive: true },
    });

    if (!permission) {
      throw new Error(`Permission '${permissionName}' not found`);
    }

    // Check if already exists
    let entityRolePermission = await this.entityRolePermissionRepository.findOne({
      where: {
        entityId,
        roleId,
        permissionId: permission.id,
      },
    });

    if (entityRolePermission) {
      // Update existing
      entityRolePermission.isGranted = true;
      entityRolePermission.grantedAt = new Date();
      entityRolePermission.grantedBy = grantedBy;
    } else {
      // Create new
      entityRolePermission = this.entityRolePermissionRepository.create({
        entityId,
        roleId,
        permissionId: permission.id,
        isGranted: true,
        grantedBy,
      });
    }

    return await this.entityRolePermissionRepository.save(entityRolePermission);
  }

  /**
   * Revoke permission from role in specific entity
   */
  async revokeEntityPermission(
    entityId: string,
    roleId: string,
    permissionName: string,
    revokedBy?: string,
  ): Promise<void> {
    const permission = await this.permissionRepository.findOne({
      where: { name: permissionName },
    });

    if (!permission) {
      throw new Error(`Permission '${permissionName}' not found`);
    }

    await this.entityRolePermissionRepository.delete({
      entityId,
      roleId,
      permissionId: permission.id,
    });

    this.logger.log(`Revoked permission ${permissionName} from role ${roleId} in entity ${entityId}`);
  }

  /**
   * Get all entity permissions for a role
   */
  async getRolePermissionsInEntity(
    roleId: string,
    entityId: string,
  ): Promise<EntityRolePermission[]> {
    return await this.entityRolePermissionRepository.find({
      where: { roleId, entityId },
      relations: ['permission', 'entity', 'role'],
    });
  }
}
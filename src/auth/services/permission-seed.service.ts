import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { EntityRolePermission } from '../entities/entity-role-permission.entity';
import { 
  RoleName, 
  PERMISSIONS, 
  ROLE_PERMISSIONS, 
  ROLE_DESCRIPTIONS, 
  ROLE_LEVELS,
  PERMISSION_DESCRIPTIONS 
} from '../constants/permissions.constants';

/**
 * PermissionSeedService - Seeds initial roles and permissions
 * Creates default system roles and assigns appropriate permissions
 */
@Injectable()
export class PermissionSeedService {
  private readonly logger = new Logger(PermissionSeedService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(EntityRolePermission)
    private readonly entityRolePermissionRepository: Repository<EntityRolePermission>,
  ) {}

  /**
   * Seed all default roles and permissions
   */
  async seedAll(): Promise<void> {
    this.logger.log('Starting permission system seeding...');

    try {
      // 1. Create default roles
      await this.seedRoles();

      // 2. Create default permissions
      await this.seedPermissions();

      // 3. Assign permissions to roles
      await this.seedRolePermissions();

      this.logger.log('Permission system seeding completed successfully');
    } catch (error) {
      this.logger.error('Error during permission seeding:', error.message);
      throw error;
    }
  }

  /**
   * Seed default system roles
   */
  async seedRoles(): Promise<void> {
    this.logger.log('Seeding default roles...');

    const rolesToCreate = [
      {
        name: RoleName.SUPER_ADMIN,
        displayName: 'Super Administrator',
        description: ROLE_DESCRIPTIONS[RoleName.SUPER_ADMIN],
        level: ROLE_LEVELS[RoleName.SUPER_ADMIN],
        isSystemRole: true,
      },
      {
        name: RoleName.ADMIN,
        displayName: 'Administrator',
        description: ROLE_DESCRIPTIONS[RoleName.ADMIN],
        level: ROLE_LEVELS[RoleName.ADMIN],
        isSystemRole: true,
      },
      {
        name: RoleName.HR,
        displayName: 'Human Resources',
        description: ROLE_DESCRIPTIONS[RoleName.HR],
        level: ROLE_LEVELS[RoleName.HR],
        isSystemRole: true,
      },
      {
        name: RoleName.MANAGER,
        displayName: 'Manager',
        description: ROLE_DESCRIPTIONS[RoleName.MANAGER],
        level: ROLE_LEVELS[RoleName.MANAGER],
        isSystemRole: true,
      },
      {
        name: RoleName.EMPLOYEE,
        displayName: 'Employee',
        description: ROLE_DESCRIPTIONS[RoleName.EMPLOYEE],
        level: ROLE_LEVELS[RoleName.EMPLOYEE],
        isSystemRole: true,
      },
    ];

    for (const roleData of rolesToCreate) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        const role = this.roleRepository.create(roleData);
        await this.roleRepository.save(role);
        this.logger.log(`Created role: ${roleData.name}`);
      } else {
        this.logger.log(`Role already exists: ${roleData.name}`);
      }
    }
  }

  /**
   * Seed default permissions
   */
  async seedPermissions(): Promise<void> {
    this.logger.log('Seeding default permissions...');

    const permissionsToCreate = Object.entries(PERMISSIONS).map(([key, value]) => {
      const [resource, action, scope] = value.split(':');
      return {
        name: value,
        displayName: PERMISSION_DESCRIPTIONS[value] || key.replace(/_/g, ' ').toLowerCase(),
        description: PERMISSION_DESCRIPTIONS[value],
        resource,
        action,
        scope,
      };
    });

    for (const permissionData of permissionsToCreate) {
      const existingPermission = await this.permissionRepository.findOne({
        where: { name: permissionData.name },
      });

      if (!existingPermission) {
        const permission = this.permissionRepository.create(permissionData);
        await this.permissionRepository.save(permission);
        this.logger.log(`Created permission: ${permissionData.name}`);
      } else {
        this.logger.log(`Permission already exists: ${permissionData.name}`);
      }
    }
  }

  /**
   * Assign permissions to roles
   */
  async seedRolePermissions(): Promise<void> {
    this.logger.log('Seeding role-permission assignments...');

    for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      const role = await this.roleRepository.findOne({
        where: { name: roleName },
      });

      if (!role) {
        this.logger.warn(`Role not found: ${roleName}`);
        continue;
      }

      for (const permissionName of permissions as string[]) {
        const permission = await this.permissionRepository.findOne({
          where: { name: permissionName },
        });

        if (!permission) {
          this.logger.warn(`Permission not found: ${permissionName}`);
          continue;
        }

        // Check if already assigned
        const existingAssignment = await this.rolePermissionRepository.findOne({
          where: { roleId: role.id, permissionId: permission.id },
        });

        if (!existingAssignment) {
          const rolePermission = this.rolePermissionRepository.create({
            roleId: role.id,
            permissionId: permission.id,
            isGranted: true,
          });

          await this.rolePermissionRepository.save(rolePermission);
          this.logger.debug(`Assigned ${permissionName} to ${roleName}`);
        }
      }

      this.logger.log(`Completed permission assignments for role: ${roleName}`);
    }
  }

  /**
   * Seed entity-specific permissions for testing
   */
  async seedEntityPermissions(entityId: string, entityType: 'HOTEL' | 'TECH_COMPANY' | 'OFFICE'): Promise<void> {
    this.logger.log(`Seeding entity-specific permissions for ${entityType} entity: ${entityId}`);

    const managerRole = await this.roleRepository.findOne({
      where: { name: RoleName.MANAGER },
    });

    if (!managerRole) {
      throw new Error('Manager role not found');
    }

    // Define entity-specific permissions
    const entityPermissions = {
      HOTEL: [
        PERMISSIONS.VIEW_TEAM_ATTENDANCE,
        PERMISSIONS.EXPORT_ATTENDANCE,
        PERMISSIONS.VIEW_TEAM_REPORTS,
        PERMISSIONS.EXPORT_REPORTS,
        PERMISSIONS.MANAGE_ATTENDANCE,
      ],
      TECH_COMPANY: [
        PERMISSIONS.VIEW_TEAM_REQUESTS,
        PERMISSIONS.APPROVE_REQUESTS,
        PERMISSIONS.VIEW_TEAM_USERS,
        // Notice: NO attendance viewing permissions
      ],
      OFFICE: [
        PERMISSIONS.VIEW_TEAM_ATTENDANCE,
        PERMISSIONS.VIEW_TEAM_REQUESTS,
        PERMISSIONS.APPROVE_REQUESTS,
        PERMISSIONS.VIEW_TEAM_REPORTS,
      ],
    };

    const permissionsForEntity = entityPermissions[entityType] || [];

    for (const permissionName of permissionsForEntity) {
      const permission = await this.permissionRepository.findOne({
        where: { name: permissionName },
      });

      if (!permission) {
        this.logger.warn(`Permission not found: ${permissionName}`);
        continue;
      }

      // Check if already assigned
      const existingAssignment = await this.entityRolePermissionRepository.findOne({
        where: {
          entityId,
          roleId: managerRole.id,
          permissionId: permission.id,
        },
      });

      if (!existingAssignment) {
        const entityRolePermission = this.entityRolePermissionRepository.create({
          entityId,
          roleId: managerRole.id,
          permissionId: permission.id,
          isGranted: true,
        });

        await this.entityRolePermissionRepository.save(entityRolePermission);
        this.logger.log(`Granted ${permissionName} to MANAGER in ${entityType} entity`);
      }
    }
  }

  /**
   * Create test user with role assignment
   */
  async createTestUserWithRole(
    userId: string,
    roleName: RoleName,
    entityId?: string,
  ): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { name: roleName },
    });

    if (!role) {
      throw new Error(`Role '${roleName}' not found`);
    }

    // This would be handled by UserRole repository in a real implementation
    this.logger.log(`Test user ${userId} would be assigned role ${roleName}${entityId ? ` in entity ${entityId}` : ''}`);
  }
}
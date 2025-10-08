import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for permissions
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * RequirePermissions decorator - Specifies required permissions for endpoints
 * 
 * Usage:
 * @RequirePermissions('APPROVE_REQUESTS')
 * @RequirePermissions('VIEW_TEAM_REPORTS', 'EXPORT_REPORTS')
 * 
 * Permission format: RESOURCE:ACTION:SCOPE
 * Examples:
 * - 'REQUEST:APPROVE:TEAM'
 * - 'ATTENDANCE:VIEW:OWN'
 * - 'REPORT:EXPORT:ALL'
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Convenience decorators for common permissions
 */

// Request Management Permissions
export const CanCreateRequests = () => RequirePermissions('REQUEST:CREATE:OWN');
export const CanApproveRequests = () => RequirePermissions('REQUEST:APPROVE:TEAM');
export const CanViewTeamRequests = () => RequirePermissions('REQUEST:VIEW:TEAM');
export const CanViewAllRequests = () => RequirePermissions('REQUEST:VIEW:ALL');
export const CanDeleteRequests = () => RequirePermissions('REQUEST:DELETE:TEAM');

// Attendance Permissions
export const CanViewOwnAttendance = () => RequirePermissions('ATTENDANCE:VIEW:OWN');
export const CanViewTeamAttendance = () => RequirePermissions('ATTENDANCE:VIEW:TEAM');
export const CanViewAllAttendance = () => RequirePermissions('ATTENDANCE:VIEW:ALL');
export const CanManageAttendance = () => RequirePermissions('ATTENDANCE:MANAGE:TEAM');

// Leave Management Permissions
export const CanCreateLeaveRequests = () => RequirePermissions('LEAVE:CREATE:OWN');
export const CanApproveLeaveRequests = () => RequirePermissions('LEAVE:APPROVE:TEAM');
export const CanViewTeamLeave = () => RequirePermissions('LEAVE:VIEW:TEAM');
export const CanManageLeaveBalances = () => RequirePermissions('LEAVE:MANAGE:TEAM');

// Report Permissions
export const CanViewOwnReports = () => RequirePermissions('REPORT:VIEW:OWN');
export const CanViewTeamReports = () => RequirePermissions('REPORT:VIEW:TEAM');
export const CanViewAllReports = () => RequirePermissions('REPORT:VIEW:ALL');
export const CanExportReports = () => RequirePermissions('REPORT:EXPORT:TEAM');

// User Management Permissions
export const CanViewUsers = () => RequirePermissions('USER:VIEW:TEAM');
export const CanManageUsers = () => RequirePermissions('USER:MANAGE:ALL');
export const CanUpdateUserProfiles = () => RequirePermissions('USER:UPDATE:TEAM');

// Entity Management Permissions
export const CanCreateEntities = () => RequirePermissions('ENTITY:CREATE:ALL');
export const CanUpdateEntities = () => RequirePermissions('ENTITY:UPDATE:ALL');
export const CanDeleteEntities = () => RequirePermissions('ENTITY:DELETE:ALL');
export const CanViewEntities = () => RequirePermissions('ENTITY:VIEW:ALL');

// Department Management Permissions
export const CanCreateDepartments = () => RequirePermissions('DEPARTMENT:CREATE:ALL');
export const CanUpdateDepartments = () => RequirePermissions('DEPARTMENT:UPDATE:ALL');
export const CanDeleteDepartments = () => RequirePermissions('DEPARTMENT:DELETE:ALL');
export const CanManageDepartments = () => RequirePermissions('DEPARTMENT:MANAGE:ALL');

// Holiday Management Permissions
export const CanCreateHolidays = () => RequirePermissions('HOLIDAY:CREATE:ALL');
export const CanUpdateHolidays = () => RequirePermissions('HOLIDAY:UPDATE:ALL');
export const CanDeleteHolidays = () => RequirePermissions('HOLIDAY:DELETE:ALL');
export const CanManageHolidays = () => RequirePermissions('HOLIDAY:MANAGE:ALL');

// Role Management Permissions (Admin only)
export const CanManageRoles = () => RequirePermissions('ROLE:MANAGE:ALL');
export const CanManagePermissions = () => RequirePermissions('PERMISSION:MANAGE:ALL');
export const CanAssignRoles = () => RequirePermissions('ROLE:ASSIGN:ALL');

// System Administration Permissions
export const AdminOnly = () => RequirePermissions('SYSTEM:ADMIN:ALL');
export const SuperAdminOnly = () => RequirePermissions('SYSTEM:SUPER_ADMIN:ALL');

/**
 * Role-based convenience decorators
 * These check for specific roles rather than granular permissions
 */
export const RequireRole = (...roles: string[]) => 
  SetMetadata('roles', roles.map(role => role.toUpperCase()));

export const ManagerOnly = () => RequireRole('MANAGER');
export const HROnly = () => RequireRole('HR', 'ADMIN');
export const AdminOrHR = () => RequireRole('ADMIN', 'HR');

/**
 * Combined permission decorators for complex scenarios
 */
export const CanManageTeam = () => RequirePermissions(
  'REQUEST:APPROVE:TEAM',
  'ATTENDANCE:VIEW:TEAM',
  'LEAVE:APPROVE:TEAM'
);

export const CanManageReports = () => RequirePermissions(
  'REPORT:VIEW:TEAM',
  'REPORT:EXPORT:TEAM'
);

export const CanFullEntityManagement = () => RequirePermissions(
  'ENTITY:CREATE:ALL',
  'ENTITY:UPDATE:ALL',
  'ENTITY:DELETE:ALL',
  'ENTITY:VIEW:ALL'
);

/**
 * Permission validation helpers
 */
export class PermissionHelper {
  /**
   * Validate permission format
   */
  static isValidPermissionFormat(permission: string): boolean {
    const parts = permission.split(':');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  /**
   * Parse permission into components
   */
  static parsePermission(permission: string): { resource: string; action: string; scope: string } | null {
    if (!this.isValidPermissionFormat(permission)) {
      return null;
    }

    const [resource, action, scope] = permission.split(':');
    return { resource, action, scope };
  }

  /**
   * Generate permission string
   */
  static generatePermission(resource: string, action: string, scope: string): string {
    return `${resource.toUpperCase()}:${action.toUpperCase()}:${scope.toUpperCase()}`;
  }

  /**
   * Check if permission scope allows access to target scope
   */
  static scopeAllowsAccess(userScope: string, targetScope: string): boolean {
    const scopeHierarchy = ['OWN', 'TEAM', 'DEPARTMENT', 'ALL'];
    const userLevel = scopeHierarchy.indexOf(userScope.toUpperCase());
    const targetLevel = scopeHierarchy.indexOf(targetScope.toUpperCase());
    
    return userLevel >= targetLevel;
  }
}
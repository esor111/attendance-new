import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntityPermissionService } from '../services/entity-permission.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * EntityPermissionGuard - The main guard for entity-scoped permission checking
 * This guard reads @RequirePermissions decorators and validates user permissions
 * in the context of the specific entity from the request
 */
@Injectable()
export class EntityPermissionGuard implements CanActivate {
  private readonly logger = new Logger(EntityPermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly entityPermissionService: EntityPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [
        context.getHandler(), // Method level
        context.getClass(),   // Class level
      ],
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // 2. Extract request data
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      this.logger.warn('No user found in request - authentication required first');
      throw new ForbiddenException('Authentication required');
    }

    // 3. Extract entity ID from request
    const entityId = this.extractEntityId(request);

    if (!entityId) {
      this.logger.warn(`No entity ID found in request for permissions: ${requiredPermissions.join(', ')}`);
      throw new BadRequestException('Entity ID is required for this operation');
    }

    this.logger.debug(`Checking permissions for user ${user.id} in entity ${entityId}: ${requiredPermissions.join(', ')}`);

    // 4. Check each required permission
    for (const permission of requiredPermissions) {
      const hasPermission = await this.entityPermissionService.hasPermissionInEntity(
        user.id,
        entityId,
        permission,
      );

      if (!hasPermission) {
        this.logger.warn(`Access denied: User ${user.id} lacks permission '${permission}' in entity ${entityId}`);
        throw new ForbiddenException(
          `Access denied: Missing permission '${permission}' in the specified context`
        );
      }
    }

    this.logger.debug(`Access granted: User ${user.id} has all required permissions in entity ${entityId}`);
    return true;
  }

  /**
   * Extract entity ID from various sources in the request
   * Priority: URL params > Query params > Body > Headers
   */
  private extractEntityId(request: any): string | null {
    // Try URL parameters first (most common)
    if (request.params?.entityId) {
      return request.params.entityId;
    }

    // Try other common parameter names
    if (request.params?.id && this.isEntityRoute(request.route?.path)) {
      return request.params.id;
    }

    // Try query parameters
    if (request.query?.entityId) {
      return request.query.entityId;
    }

    // Try request body
    if (request.body?.entityId) {
      return request.body.entityId;
    }

    // Try custom header
    if (request.headers?.['x-entity-id']) {
      return request.headers['x-entity-id'];
    }

    // Try to infer from route patterns
    const inferredEntityId = this.inferEntityIdFromRoute(request);
    if (inferredEntityId) {
      return inferredEntityId;
    }

    return null;
  }

  /**
   * Check if this is an entity-specific route
   */
  private isEntityRoute(routePath?: string): boolean {
    if (!routePath) return false;
    
    const entityRoutePatterns = [
      '/entities/:id',
      '/departments/:id',
      '/api/entities/:id',
      '/api/departments/:id',
    ];

    return entityRoutePatterns.some(pattern => 
      routePath.includes('/entities/') || 
      routePath.includes('/departments/')
    );
  }

  /**
   * Try to infer entity ID from route patterns
   */
  private inferEntityIdFromRoute(request: any): string | null {
    const url = request.url || '';
    const route = request.route?.path || '';

    // Pattern: /api/entities/:entityId/something
    const entityMatch = url.match(/\/entities\/([a-f0-9-]{36})/i);
    if (entityMatch) {
      return entityMatch[1];
    }

    // Pattern: /api/departments/:departmentId/something
    const deptMatch = url.match(/\/departments\/([a-f0-9-]{36})/i);
    if (deptMatch) {
      return deptMatch[1];
    }

    // Pattern: /api/attendance/:entityId
    const attendanceMatch = url.match(/\/attendance\/([a-f0-9-]{36})/i);
    if (attendanceMatch) {
      return attendanceMatch[1];
    }

    return null;
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
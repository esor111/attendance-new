import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EntityAccessService } from '../services/entity-access.service';
import { CreateUserEntityAssignmentDto } from '../dto/create-user-entity-assignment.dto';
import { UpdateUserEntityAssignmentDto } from '../dto/update-user-entity-assignment.dto';
import {
  EntityAccessResponseDto,
  UserEntityAssignmentsResponseDto,
  EntityValidationResponseDto,
} from '../dto/entity-access-response.dto';

/**
 * Entity Access Controller - Manages user entity assignments and access resolution
 * Handles user-specific entity assignments and access validation
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
@Controller('api/attendance/entity-access')
export class EntityAccessController {
  constructor(private readonly entityAccessService: EntityAccessService) {}

  /**
   * Get all authorized entities for a user
   * Requirements: 5.3, 5.4 - Combined entity access
   */
  @Get('users/:userId/entities')
  async getUserAuthorizedEntities(
    @Param('userId') userId: string,
  ): Promise<EntityAccessResponseDto[]> {
    const entities = await this.entityAccessService.getAuthorizedEntities(userId);
    
    return entities.map(entity => ({
      id: entity.id,
      name: entity.name,
      kahaId: entity.kahaId,
      address: entity.address,
      radiusMeters: entity.radiusMeters,
      assignmentType: 'user' as const, // This would need to be determined from the service
    }));
  }

  /**
   * Get user's primary entity
   * Requirements: 5.2, 5.6 - Primary entity designation
   */
  @Get('users/:userId/primary-entity')
  async getUserPrimaryEntity(
    @Param('userId') userId: string,
  ): Promise<EntityAccessResponseDto | null> {
    const entity = await this.entityAccessService.getPrimaryEntity(userId);
    
    if (!entity) {
      return null;
    }
    
    return {
      id: entity.id,
      name: entity.name,
      kahaId: entity.kahaId,
      address: entity.address,
      radiusMeters: entity.radiusMeters,
      isPrimary: true,
      assignmentType: 'user', // This would need to be determined from the service
    };
  }

  /**
   * Get detailed entity assignments for a user
   * Requirements: 5.1, 5.2, 5.3 - Complete assignment information
   */
  @Get('users/:userId/assignments')
  async getUserEntityAssignments(
    @Param('userId') userId: string,
  ): Promise<UserEntityAssignmentsResponseDto> {
    const assignments = await this.entityAccessService.getUserEntityAssignments(userId);
    
    return {
      userAssignments: assignments.userAssignments.map(assignment => ({
        id: assignment.id,
        entityId: assignment.entityId,
        isPrimary: assignment.isPrimary,
        entity: {
          id: assignment.entity.id,
          name: assignment.entity.name,
          kahaId: assignment.entity.kahaId,
          address: assignment.entity.address,
          radiusMeters: assignment.entity.radiusMeters,
        },
      })),
      departmentAssignments: assignments.departmentAssignments.map(assignment => ({
        id: assignment.id,
        entityId: assignment.entityId,
        isPrimary: assignment.isPrimary,
        entity: {
          id: assignment.entity?.id || assignment.entityId,
          name: assignment.entity?.name || 'Unknown Entity',
          kahaId: assignment.entity?.kahaId || '',
          address: assignment.entity?.address,
          radiusMeters: assignment.entity?.radiusMeters || 100,
        },
      })),
      combinedEntities: assignments.combinedEntities.map(entity => ({
        id: entity.id,
        name: entity.name,
        kahaId: entity.kahaId,
        address: entity.address,
        radiusMeters: entity.radiusMeters,
        assignmentType: 'user' as const, // This would need logic to determine type
      })),
    };
  }

  /**
   * Check if user has access to specific entity
   * Requirements: 5.4, 5.5 - Entity access validation
   */
  @Get('users/:userId/entities/:entityId/access')
  async checkEntityAccess(
    @Param('userId') userId: string,
    @Param('entityId') entityId: string,
  ): Promise<EntityValidationResponseDto> {
    const hasAccess = await this.entityAccessService.hasEntityAccess(userId, entityId);
    
    if (!hasAccess) {
      return { hasAccess: false };
    }
    
    try {
      const entity = await this.entityAccessService.validateEntityAccess(userId, entityId);
      return {
        hasAccess: true,
        entity: {
          id: entity.id,
          name: entity.name,
          kahaId: entity.kahaId,
          address: entity.address,
          radiusMeters: entity.radiusMeters,
        },
        accessType: 'user', // This would need logic to determine actual access type
      };
    } catch (error) {
      return { hasAccess: false };
    }
  }

  /**
   * Create user entity assignment
   * Requirements: 5.1, 5.2, 5.6 - User-specific assignments and primary designation
   */
  @Post('assignments')
  async createUserEntityAssignment(
    @Body() createDto: CreateUserEntityAssignmentDto,
  ) {
    const assignment = await this.entityAccessService.createUserEntityAssignment(
      createDto.userId,
      createDto.entityId,
      createDto.isPrimary,
    );
    
    return {
      id: assignment.id,
      userId: assignment.userId,
      entityId: assignment.entityId,
      isPrimary: assignment.isPrimary,
      createdAt: assignment.createdAt,
    };
  }

  /**
   * Update user entity assignment
   * Requirements: 5.2, 5.6 - Primary entity management
   */
  @Put('users/:userId/entities/:entityId')
  async updateUserEntityAssignment(
    @Param('userId') userId: string,
    @Param('entityId') entityId: string,
    @Body() updateDto: UpdateUserEntityAssignmentDto,
  ) {
    const assignment = await this.entityAccessService.updateUserEntityAssignment(
      userId,
      entityId,
      updateDto.isPrimary,
    );
    
    return {
      id: assignment.id,
      userId: assignment.userId,
      entityId: assignment.entityId,
      isPrimary: assignment.isPrimary,
      updatedAt: assignment.updatedAt,
    };
  }

  /**
   * Set primary entity for user
   * Requirements: 5.2, 5.6 - Primary entity designation
   */
  @Put('users/:userId/primary-entity/:entityId')
  async setPrimaryEntity(
    @Param('userId') userId: string,
    @Param('entityId') entityId: string,
  ) {
    const assignment = await this.entityAccessService.setPrimaryEntity(userId, entityId);
    
    return {
      id: assignment.id,
      userId: assignment.userId,
      entityId: assignment.entityId,
      isPrimary: assignment.isPrimary,
      message: 'Primary entity set successfully',
    };
  }

  /**
   * Remove user entity assignment
   * Requirements: 5.5 - Assignment management
   */
  @Delete('users/:userId/entities/:entityId')
  async removeUserEntityAssignment(
    @Param('userId') userId: string,
    @Param('entityId') entityId: string,
  ) {
    await this.entityAccessService.removeUserEntityAssignment(userId, entityId);
    
    return {
      message: 'User entity assignment removed successfully',
    };
  }
}
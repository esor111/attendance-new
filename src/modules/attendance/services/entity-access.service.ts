import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntityAssignmentRepository } from '../repositories/user-entity-assignment.repository';
import { User } from '../../user/entities/user.entity';
import { Entity } from '../../entity/entities/entity.entity';
import { DepartmentEntityAssignment } from '../../department/entities/department-entity-assignment.entity';
import { UserEntityAssignment } from '../entities/user-entity-assignment.entity';

/**
 * Entity Access Service - Resolves authorized entities for users
 * Implements priority logic: user-specific assignments override department assignments
 * Combines user and department entity assignments based on requirements 5.1-5.6
 */
@Injectable()
export class EntityAccessService {
  constructor(
    private readonly userEntityAssignmentRepository: UserEntityAssignmentRepository,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Entity)
    private readonly entityRepository: Repository<Entity>,
    @InjectRepository(DepartmentEntityAssignment)
    private readonly departmentEntityAssignmentRepository: Repository<DepartmentEntityAssignment>,
  ) {}

  /**
   * Get all authorized entities for a user
   * Priority: user-specific assignments first, then department assignments
   * Requirements: 5.3, 5.4 - Priority logic and combination of assignments
   */
  async getAuthorizedEntities(userId: string): Promise<Entity[]> {
    // Get user-specific entity assignments
    const userAssignments = await this.userEntityAssignmentRepository.getAuthorizedEntitiesWithDetails(userId);
    
    // Get user's department assignments
    const departmentEntities = await this.getDepartmentEntities(userId);
    
    // Combine entities, prioritizing user-specific assignments
    const entityMap = new Map<string, Entity>();
    
    // Add department entities first
    departmentEntities.forEach(entity => {
      entityMap.set(entity.id, entity);
    });
    
    // Add user-specific entities (will override department entities if same ID)
    userAssignments.forEach(assignment => {
      if (assignment.entity) {
        entityMap.set(assignment.entity.id, assignment.entity);
      }
    });
    
    return Array.from(entityMap.values());
  }

  /**
   * Get authorized entity IDs for a user
   * Requirements: 5.3, 5.4 - Combined entity access
   */
  async getAuthorizedEntityIds(userId: string): Promise<string[]> {
    const entities = await this.getAuthorizedEntities(userId);
    return entities.map(entity => entity.id);
  }

  /**
   * Check if user has access to a specific entity
   * Checks both user-specific and department assignments
   * Requirements: 5.4, 5.5 - Entity access validation
   */
  async hasEntityAccess(userId: string, entityId: string): Promise<boolean> {
    // First check user-specific assignments
    const hasUserAccess = await this.userEntityAssignmentRepository.hasAccess(userId, entityId);
    if (hasUserAccess) {
      return true;
    }
    
    // Then check department assignments
    const hasDepartmentAccess = await this.hasDepartmentEntityAccess(userId, entityId);
    return hasDepartmentAccess;
  }

  /**
   * Get user's primary entity
   * Priority: user-specific primary, then department primary
   * Requirements: 5.2, 5.6 - Primary entity designation
   */
  async getPrimaryEntity(userId: string): Promise<Entity | null> {
    // First check for user-specific primary entity
    const userPrimary = await this.userEntityAssignmentRepository.findPrimaryByUserId(userId);
    if (userPrimary && userPrimary.entity) {
      return userPrimary.entity;
    }
    
    // Then check for department primary entity
    const departmentPrimary = await this.getDepartmentPrimaryEntity(userId);
    return departmentPrimary;
  }

  /**
   * Validate entity access and throw error if not authorized
   * Requirements: 5.4, 5.5 - Access validation with error handling
   */
  async validateEntityAccess(userId: string, entityId: string): Promise<Entity> {
    const hasAccess = await this.hasEntityAccess(userId, entityId);
    if (!hasAccess) {
      throw new NotFoundException(
        `User ${userId} does not have access to entity ${entityId}. Check user-specific or department entity assignments.`
      );
    }
    
    const entity = await this.entityRepository.findOne({ where: { id: entityId } });
    if (!entity) {
      throw new NotFoundException(`Entity with ID ${entityId} not found`);
    }
    
    return entity;
  }

  /**
   * Get user's entity assignments with assignment details
   * Includes both user-specific and department assignments with metadata
   * Requirements: 5.1, 5.2, 5.3 - Complete assignment information
   */
  async getUserEntityAssignments(userId: string): Promise<{
    userAssignments: UserEntityAssignment[];
    departmentAssignments: DepartmentEntityAssignment[];
    combinedEntities: Entity[];
  }> {
    const userAssignments = await this.userEntityAssignmentRepository.getAuthorizedEntitiesWithDetails(userId);
    const departmentAssignments = await this.getDepartmentEntityAssignments(userId);
    const combinedEntities = await this.getAuthorizedEntities(userId);
    
    return {
      userAssignments,
      departmentAssignments,
      combinedEntities,
    };
  }

  /**
   * Create user entity assignment
   * Requirements: 5.1, 5.2, 5.6 - User-specific assignments and primary designation
   */
  async createUserEntityAssignment(
    userId: string,
    entityId: string,
    isPrimary: boolean = false
  ): Promise<UserEntityAssignment> {
    // Validate user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    // Validate entity exists
    const entity = await this.entityRepository.findOne({ where: { id: entityId } });
    if (!entity) {
      throw new NotFoundException(`Entity with ID ${entityId} not found`);
    }
    
    // Check for existing assignment
    const existing = await this.userEntityAssignmentRepository.findByUserIdAndEntityId(userId, entityId);
    if (existing) {
      throw new Error(`User ${userId} already has assignment to entity ${entityId}`);
    }
    
    // If setting as primary, handle primary entity logic
    if (isPrimary) {
      await this.clearUserPrimaryEntity(userId);
    }
    
    return await this.userEntityAssignmentRepository.create({
      userId,
      entityId,
      isPrimary,
    });
  }

  /**
   * Update user entity assignment
   * Requirements: 5.2, 5.6 - Primary entity management
   */
  async updateUserEntityAssignment(
    userId: string,
    entityId: string,
    isPrimary?: boolean
  ): Promise<UserEntityAssignment> {
    const assignment = await this.userEntityAssignmentRepository.findByUserIdAndEntityId(userId, entityId);
    if (!assignment) {
      throw new NotFoundException(`User entity assignment not found for user ${userId} and entity ${entityId}`);
    }
    
    // If setting as primary, clear other primary assignments
    if (isPrimary === true) {
      await this.clearUserPrimaryEntity(userId);
    }
    
    return await this.userEntityAssignmentRepository.update(assignment.id, { isPrimary });
  }

  /**
   * Remove user entity assignment
   * Requirements: 5.5 - Assignment management
   */
  async removeUserEntityAssignment(userId: string, entityId: string): Promise<void> {
    await this.userEntityAssignmentRepository.deleteByUserIdAndEntityId(userId, entityId);
  }

  /**
   * Set primary entity for user
   * Requirements: 5.2, 5.6 - Primary entity designation
   */
  async setPrimaryEntity(userId: string, entityId: string): Promise<UserEntityAssignment> {
    // Validate access to entity
    await this.validateEntityAccess(userId, entityId);
    
    // Check if user has assignment to this entity
    let assignment = await this.userEntityAssignmentRepository.findByUserIdAndEntityId(userId, entityId);
    
    // If no user-specific assignment exists, create one
    if (!assignment) {
      assignment = await this.createUserEntityAssignment(userId, entityId, true);
    } else {
      // Clear other primary assignments and set this one
      await this.clearUserPrimaryEntity(userId);
      assignment = await this.userEntityAssignmentRepository.update(assignment.id, { isPrimary: true });
    }
    
    return assignment;
  }

  /**
   * Get entities accessible through department assignments
   * Private helper method
   */
  private async getDepartmentEntities(userId: string): Promise<Entity[]> {
    const query = `
      SELECT DISTINCT e.*
      FROM entities e
      INNER JOIN department_entity_assignments dea ON e.id = dea.entity_id
      INNER JOIN users u ON u.department_id = dea.department_id
      WHERE u.id = $1
      ORDER BY dea.is_primary DESC, e.name ASC
    `;
    
    return await this.entityRepository.query(query, [userId]);
  }

  /**
   * Get department entity assignments for a user
   * Private helper method
   */
  private async getDepartmentEntityAssignments(userId: string): Promise<DepartmentEntityAssignment[]> {
    const query = `
      SELECT dea.*, e.name as entity_name, e.kaha_id as entity_kaha_id
      FROM department_entity_assignments dea
      INNER JOIN entities e ON e.id = dea.entity_id
      INNER JOIN users u ON u.department_id = dea.department_id
      WHERE u.id = $1
      ORDER BY dea.is_primary DESC, dea.created_at ASC
    `;
    
    return await this.departmentEntityAssignmentRepository.query(query, [userId]);
  }

  /**
   * Check if user has access to entity through department
   * Private helper method
   */
  private async hasDepartmentEntityAccess(userId: string, entityId: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM department_entity_assignments dea
      INNER JOIN users u ON u.department_id = dea.department_id
      WHERE u.id = $1 AND dea.entity_id = $2
    `;
    
    const result = await this.departmentEntityAssignmentRepository.query(query, [userId, entityId]);
    return parseInt(result[0].count) > 0;
  }

  /**
   * Get department primary entity for user
   * Private helper method
   */
  private async getDepartmentPrimaryEntity(userId: string): Promise<Entity | null> {
    const query = `
      SELECT e.*
      FROM entities e
      INNER JOIN department_entity_assignments dea ON e.id = dea.entity_id
      INNER JOIN users u ON u.department_id = dea.department_id
      WHERE u.id = $1 AND dea.is_primary = true
      LIMIT 1
    `;
    
    const result = await this.entityRepository.query(query, [userId]);
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Clear primary entity designation for user
   * Private helper method
   */
  private async clearUserPrimaryEntity(userId: string): Promise<void> {
    const userAssignments = await this.userEntityAssignmentRepository.findByUserId(userId);
    for (const assignment of userAssignments) {
      if (assignment.isPrimary) {
        await this.userEntityAssignmentRepository.update(assignment.id, { isPrimary: false });
      }
    }
  }
}
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntityAssignment } from '../entities/user-entity-assignment.entity';

/**
 * User Entity Assignment Repository - Handles user-specific entity assignments
 * Manages direct entity access for individual users beyond department assignments
 */
@Injectable()
export class UserEntityAssignmentRepository {
  constructor(
    @InjectRepository(UserEntityAssignment)
    private readonly repository: Repository<UserEntityAssignment>,
  ) { }

  /**
   * Create a new user entity assignment
   */
  async create(assignmentData: Partial<UserEntityAssignment>): Promise<UserEntityAssignment> {
    const assignment = this.repository.create(assignmentData);
    return await this.repository.save(assignment);
  }

  /**
   * Update an existing assignment
   */
  async update(id: string, updateData: Partial<UserEntityAssignment>): Promise<UserEntityAssignment> {
    await this.repository.update(id, updateData);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`User entity assignment with id ${id} not found`);
    }
    return updated;
  }

  /**
   * Find assignment by ID
   */
  async findById(id: string): Promise<UserEntityAssignment | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['user', 'entity'],
    });
  }

  /**
   * Find all entity assignments for a user
   */
  async findByUserId(userId: string): Promise<UserEntityAssignment[]> {
    return await this.repository.find({
      where: { userId },
      relations: ['entity'],
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  /**
   * Find primary entity assignment for a user
   */
  async findPrimaryByUserId(userId: string): Promise<UserEntityAssignment | null> {
    return await this.repository.findOne({
      where: {
        userId,
        isPrimary: true,
      },
      relations: ['entity'],
    });
  }

  /**
   * Find all users assigned to an entity
   */
  async findByEntityId(entityId: string): Promise<UserEntityAssignment[]> {
    return await this.repository.find({
      where: { entityId },
      relations: ['user'],
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  /**
   * Check if user has access to specific entity
   */
  async hasAccess(userId: string, entityId: string): Promise<boolean> {
    const assignment = await this.repository.findOne({
      where: { userId, entityId },
    });
    return !!assignment;
  }

  /**
   * Get all authorized entity IDs for a user
   */
  async getAuthorizedEntityIds(userId: string): Promise<string[]> {
    const assignments = await this.repository.find({
      where: { userId },
      select: ['entityId'],
    });
    return assignments.map(assignment => assignment.entityId);
  }

  /**
   * Set primary entity for a user (removes primary from others)
   */
  async setPrimaryEntity(userId: string, entityId: string): Promise<UserEntityAssignment> {
    // First, remove primary flag from all user's assignments
    await this.repository.update(
      { userId },
      { isPrimary: false }
    );

    // Then set the specified entity as primary
    await this.repository.update(
      { userId, entityId },
      { isPrimary: true }
    );

    const assignment = await this.repository.findOne({
      where: { userId, entityId },
      relations: ['entity'],
    });
    if (!assignment) {
      throw new Error(`User entity assignment not found for user ${userId} and entity ${entityId}`);
    }
    return assignment;
  }

  /**
   * Find assignment by user and entity
   */
  async findByUserIdAndEntityId(userId: string, entityId: string): Promise<UserEntityAssignment | null> {
    return await this.repository.findOne({
      where: { userId, entityId },
      relations: ['user', 'entity'],
    });
  }

  /**
   * Get entity assignments with entity details for authorized entities
   */
  async getAuthorizedEntitiesWithDetails(userId: string): Promise<UserEntityAssignment[]> {
    return await this.repository.find({
      where: { userId },
      relations: ['entity'],
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  /**
   * Delete assignment
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Delete assignment by user and entity
   */
  async deleteByUserIdAndEntityId(userId: string, entityId: string): Promise<void> {
    await this.repository.delete({ userId, entityId });
  }

  /**
   * Delete all assignments for a user
   */
  async deleteByUserId(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }

  /**
   * Delete all assignments for an entity
   */
  async deleteByEntityId(entityId: string): Promise<void> {
    await this.repository.delete({ entityId });
  }
}
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

/**
 * User Repository - Data access layer for user operations
 * Provides CRUD operations and specialized queries for user management
 */
@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  /**
   * Find user by ID with department relation
   */
  async findById(id: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['department'],
    });
  }

  /**
   * Find user by external user ID
   */
  async findByUserId(userId: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { userId },
      relations: ['department'],
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { email },
      relations: ['department'],
    });
  }

  /**
   * Find users by department ID
   */
  async findByDepartmentId(departmentId: string): Promise<User[]> {
    return await this.repository.find({
      where: { departmentId },
      relations: ['department'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Create a new user
   */
  async create(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return await this.repository.save(user);
  }

  /**
   * Update user
   */
  async update(id: string, userData: Partial<User>): Promise<User> {
    await this.repository.update(id, userData);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated user');
    }
    return updated;
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Find all users
   */
  async findAll(): Promise<User[]> {
    return await this.repository.find({
      relations: ['department'],
      order: { name: 'ASC' },
    });
  }
}
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveType } from '../entities/leave-type.entity';

/**
 * Leave Type Repository - Data access layer for leave type operations
 * Provides CRUD operations and business-specific queries for leave types
 */
@Injectable()
export class LeaveTypeRepository {
  constructor(
    @InjectRepository(LeaveType)
    private readonly repository: Repository<LeaveType>,
  ) {}

  /**
   * Create a new leave type
   */
  async create(leaveTypeData: Partial<LeaveType>): Promise<LeaveType> {
    const leaveType = this.repository.create(leaveTypeData);
    return await this.repository.save(leaveType);
  }

  /**
   * Find leave type by ID
   */
  async findById(id: string): Promise<LeaveType | null> {
    return await this.repository.findOne({ where: { id } });
  }

  /**
   * Find leave type by name
   */
  async findByName(name: string): Promise<LeaveType | null> {
    return await this.repository.findOne({ where: { name } });
  }

  /**
   * Find all active leave types
   */
  async findAllActive(): Promise<LeaveType[]> {
    return await this.repository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Find all leave types (including inactive)
   */
  async findAll(): Promise<LeaveType[]> {
    return await this.repository.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Update leave type
   */
  async update(id: string, updateData: Partial<LeaveType>): Promise<LeaveType> {
    await this.repository.update(id, updateData);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Leave type not found after update');
    }
    return updated;
  }

  /**
   * Delete leave type (soft delete by setting isActive to false)
   */
  async softDelete(id: string): Promise<void> {
    await this.repository.update(id, { isActive: false });
  }

  /**
   * Check if leave type name exists (for uniqueness validation)
   */
  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    const query = this.repository.createQueryBuilder('leaveType')
      .where('leaveType.name = :name', { name });
    
    if (excludeId) {
      query.andWhere('leaveType.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}
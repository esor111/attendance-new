import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entities/department.entity';

/**
 * Department Repository - Data access layer for department operations
 * Provides CRUD operations and specialized queries for department management
 */
@Injectable()
export class DepartmentRepository {
  constructor(
    @InjectRepository(Department)
    private readonly repository: Repository<Department>,
  ) {}

  /**
   * Find department by ID
   */
  async findById(id: string): Promise<Department | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['users', 'entityAssignments'],
    });
  }

  /**
   * Find department by name and business ID
   */
  async findByNameAndBusiness(name: string, businessId: string): Promise<Department | null> {
    return await this.repository.findOne({
      where: { name, businessId },
      relations: ['users', 'entityAssignments'],
    });
  }

  /**
   * Find all departments for a business
   */
  async findByBusinessId(businessId: string): Promise<Department[]> {
    return await this.repository.find({
      where: { businessId },
      relations: ['users', 'entityAssignments'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Create a new department
   */
  async create(departmentData: Partial<Department>): Promise<Department> {
    const department = this.repository.create(departmentData);
    return await this.repository.save(department);
  }

  /**
   * Update department
   */
  async update(id: string, departmentData: Partial<Department>): Promise<Department> {
    await this.repository.update(id, departmentData);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated department');
    }
    return updated;
  }

  /**
   * Delete department
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Find all departments
   */
  async findAll(): Promise<Department[]> {
    return await this.repository.find({
      relations: ['users', 'entityAssignments'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Get department user count
   */
  async getUserCount(departmentId: string): Promise<number> {
    return await this.repository
      .createQueryBuilder('department')
      .leftJoin('department.users', 'user')
      .where('department.id = :departmentId', { departmentId })
      .getCount();
  }
}
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { DepartmentEntityAssignment } from './entities/department-entity-assignment.entity';
import { Entity } from '../entity/entities/entity.entity';
import { 
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentResponseDto,
  DepartmentListResponseDto
} from './dto';

/**
 * Department Service - Business logic for department operations
 * Handles department management and entity assignments
 */
@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(DepartmentEntityAssignment)
    private readonly assignmentRepository: Repository<DepartmentEntityAssignment>,
    @InjectRepository(Entity)
    private readonly entityRepository: Repository<Entity>,
  ) {}

  /**
   * Assign an entity to a department
   * Requirements: 7.1, 7.2 - Validate existence and prevent duplicates
   */
  async assignEntityToDepartment(
    departmentId: string,
    entityId: string,
    isPrimary: boolean = false,
  ): Promise<DepartmentEntityAssignment> {
    // Validate department exists
    const department = await this.departmentRepository.findOne({
      where: { id: departmentId },
    });
    if (!department) {
      throw new NotFoundException(`Department with ID ${departmentId} not found`);
    }

    // Validate entity exists
    const entity = await this.entityRepository.findOne({
      where: { id: entityId },
    });
    if (!entity) {
      throw new NotFoundException(`Entity with ID ${entityId} not found`);
    }

    // Check for existing assignment (prevent duplicates)
    const existingAssignment = await this.assignmentRepository.findOne({
      where: { departmentId, entityId },
    });
    if (existingAssignment) {
      throw new ConflictException(
        `Entity ${entityId} is already assigned to department ${departmentId}`,
      );
    }

    // If marking as primary, ensure only one primary per department
    if (isPrimary) {
      await this.ensureOnlyOnePrimaryEntity(departmentId);
    }

    // Create the assignment
    const assignment = this.assignmentRepository.create({
      departmentId,
      entityId,
      isPrimary,
    });

    return await this.assignmentRepository.save(assignment);
  }

  /**
   * Set an entity as primary for a department
   * Requirements: 7.3, 7.4 - Only one primary entity per department
   */
  async setPrimaryEntity(departmentId: string, entityId: string): Promise<DepartmentEntityAssignment> {
    // Validate assignment exists
    const assignment = await this.assignmentRepository.findOne({
      where: { departmentId, entityId },
    });
    if (!assignment) {
      throw new NotFoundException(
        `Assignment between department ${departmentId} and entity ${entityId} not found`,
      );
    }

    // Unmark previous primary entity
    await this.ensureOnlyOnePrimaryEntity(departmentId);

    // Mark this assignment as primary
    assignment.isPrimary = true;
    return await this.assignmentRepository.save(assignment);
  }

  /**
   * Get all entities assigned to a department
   * Requirements: 7.5 - Retrieve department entities with primary designation
   */
  async getDepartmentEntities(departmentId: string): Promise<DepartmentEntityAssignment[]> {
    const department = await this.departmentRepository.findOne({
      where: { id: departmentId },
    });
    if (!department) {
      throw new NotFoundException(`Department with ID ${departmentId} not found`);
    }

    return await this.assignmentRepository.find({
      where: { departmentId },
      relations: ['entity'],
      order: { isPrimary: 'DESC', createdAt: 'ASC' }, // Primary first, then by creation date
    });
  }

  /**
   * Get entities accessible to a user based on their department
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5 - Entity access control
   */
  async getUserAccessibleEntities(userId: string): Promise<Entity[]> {
    // This method will need User repository, but for now we'll implement the core logic
    // The user entity should have departmentId populated
    
    // Query to get user's department entities
    const query = `
      SELECT DISTINCT e.*
      FROM entities e
      INNER JOIN department_entity_assignments dea ON e.id = dea.entity_id
      INNER JOIN users u ON u.department_id = dea.department_id
      WHERE u.id = $1
      ORDER BY dea.is_primary DESC, e.name ASC
    `;

    const entities = await this.entityRepository.query(query, [userId]);
    return entities;
  }

  /**
   * Check if a user has access to a specific entity
   * Requirements: 8.1, 8.4 - Validate user access to entities
   */
  async hasUserAccessToEntity(userId: string, entityId: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM department_entity_assignments dea
      INNER JOIN users u ON u.department_id = dea.department_id
      WHERE u.id = $1 AND dea.entity_id = $2
    `;

    const result = await this.assignmentRepository.query(query, [userId, entityId]);
    return parseInt(result[0].count) > 0;
  }

  /**
   * Remove entity assignment from department
   */
  async removeEntityAssignment(departmentId: string, entityId: string): Promise<void> {
    const assignment = await this.assignmentRepository.findOne({
      where: { departmentId, entityId },
    });
    if (!assignment) {
      throw new NotFoundException(
        `Assignment between department ${departmentId} and entity ${entityId} not found`,
      );
    }

    await this.assignmentRepository.remove(assignment);
  }

  /**
   * Private helper to ensure only one primary entity per department
   * Requirements: 7.3, 7.4 - Primary entity logic
   */
  private async ensureOnlyOnePrimaryEntity(departmentId: string): Promise<void> {
    await this.assignmentRepository.update(
      { departmentId, isPrimary: true },
      { isPrimary: false },
    );
  }

  /**
   * Get department by ID with entity assignments
   */
  async getDepartmentWithEntities(departmentId: string): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { id: departmentId },
      relations: ['entityAssignments', 'entityAssignments.entity'],
    });
    if (!department) {
      throw new NotFoundException(`Department with ID ${departmentId} not found`);
    }
    return department;
  }

  /**
   * Create a new department
   * Requirements: 3.1, 3.2, 3.3
   */
  async create(createDto: CreateDepartmentDto): Promise<DepartmentResponseDto> {
    // Check if department name already exists for this business
    const existingDepartment = await this.departmentRepository.findOne({
      where: { name: createDto.name, businessId: createDto.businessId }
    });

    if (existingDepartment) {
      throw new ConflictException(`Department '${createDto.name}' already exists for this business`);
    }

    const department = this.departmentRepository.create(createDto);
    const savedDepartment = await this.departmentRepository.save(department);

    return this.mapToDepartmentResponse(savedDepartment);
  }

  /**
   * Find all departments with pagination
   * Requirements: 3.4
   */
  async findAll(page: number, limit: number, businessId?: string): Promise<DepartmentListResponseDto> {
    const queryBuilder = this.departmentRepository.createQueryBuilder('d')
      .leftJoinAndSelect('d.users', 'u')
      .leftJoinAndSelect('d.entityAssignments', 'ea')
      .leftJoinAndSelect('ea.entity', 'e');

    if (businessId) {
      queryBuilder.where('d.businessId = :businessId', { businessId });
    }

    const [departments, totalCount] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('d.createdAt', 'DESC')
      .getManyAndCount();

    return {
      departments: departments.map(dept => ({
        id: dept.id,
        name: dept.name,
        businessId: dept.businessId,
        userCount: dept.users?.length || 0,
        entityCount: dept.entityAssignments?.length || 0,
        primaryEntity: dept.entityAssignments?.find(ea => ea.isPrimary)?.entity ? {
          id: dept.entityAssignments.find(ea => ea.isPrimary)!.entity.id,
          name: dept.entityAssignments.find(ea => ea.isPrimary)!.entity.name,
          kahaId: dept.entityAssignments.find(ea => ea.isPrimary)!.entity.kahaId,
        } : undefined,
      })),
      totalCount,
    };
  }

  /**
   * Find department by ID
   */
  async findById(id: string): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { id }
    });

    if (!department) {
      throw new NotFoundException(`Department with ID '${id}' not found`);
    }

    return department;
  }

  /**
   * Find department by ID with full details
   * Requirements: 3.4
   */
  async findByIdWithDetails(id: string): Promise<DepartmentResponseDto> {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: ['users', 'entityAssignments', 'entityAssignments.entity']
    });

    if (!department) {
      throw new NotFoundException(`Department with ID '${id}' not found`);
    }

    return this.mapToDepartmentResponse(department);
  }

  /**
   * Update department
   * Requirements: 3.2
   */
  async update(id: string, updateDto: UpdateDepartmentDto): Promise<DepartmentResponseDto> {
    const department = await this.findById(id);

    // Check name uniqueness if name is being updated
    if (updateDto.name && updateDto.name !== department.name) {
      const existingDepartment = await this.departmentRepository.findOne({
        where: { name: updateDto.name, businessId: department.businessId }
      });

      if (existingDepartment && existingDepartment.id !== id) {
        throw new ConflictException(`Department '${updateDto.name}' already exists for this business`);
      }
    }

    Object.assign(department, updateDto);
    const savedDepartment = await this.departmentRepository.save(department);

    return this.mapToDepartmentResponse(savedDepartment);
  }

  /**
   * Delete department
   * Requirements: 3.5
   */
  async delete(id: string): Promise<void> {
    const department = await this.findById(id);
    await this.departmentRepository.remove(department);
  }

  /**
   * Get entity by ID (helper method)
   */
  async getEntityById(id: string): Promise<Entity> {
    const entity = await this.entityRepository.findOne({
      where: { id }
    });

    if (!entity) {
      throw new NotFoundException(`Entity with ID '${id}' not found`);
    }

    return entity;
  }

  /**
   * Validate if user has department assigned
   * Requirements: 8.2, 8.3 - Access control validation
   */
  async validateUserDepartmentAccess(userId: string): Promise<{ hasDepartment: boolean; hasEntities: boolean }> {
    const query = `
      SELECT 
        u.department_id IS NOT NULL as has_department,
        COUNT(dea.id) > 0 as has_entities
      FROM users u
      LEFT JOIN department_entity_assignments dea ON u.department_id = dea.department_id
      WHERE u.id = $1
      GROUP BY u.id, u.department_id
    `;

    const result = await this.assignmentRepository.query(query, [userId]);
    
    if (result.length === 0) {
      return { hasDepartment: false, hasEntities: false };
    }

    return {
      hasDepartment: result[0].has_department,
      hasEntities: result[0].has_entities,
    };
  }

  /**
   * Map Department entity to response DTO
   */
  private mapToDepartmentResponse(department: Department): DepartmentResponseDto {
    return {
      id: department.id,
      name: department.name,
      businessId: department.businessId,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
      users: department.users?.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isFieldWorker: user.isFieldWorker,
      })),
      entityAssignments: department.entityAssignments?.map(assignment => ({
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
    };
  }
}
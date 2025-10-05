import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { HandshakeService } from '../../service-communication/services/handshake.service';
import { DepartmentService } from '../department/department.service';
import { 
  UpdateUserProfileDto,
  UserAccessStatusDto,
  EntityAccessResponseDto,
  UserAccessibleEntitiesResponseDto
} from './dto';

/**
 * User Service - Business logic for user operations
 * Handles user data management and validation
 * Integrates with HandshakeService for external data population
 */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly handshakeService: HandshakeService,
    private readonly departmentService: DepartmentService,
  ) { }

  /**
   * Get user by external userId, ensuring it exists locally via handshake process
   * This method demonstrates the handshake integration
   */
  async getUserByExternalId(userId: string): Promise<User> {
    return this.handshakeService.ensureUserExists(userId);
  }

  /**
   * Check if user exists locally without triggering external fetch
   */
  async checkUserExistsLocally(userId: string): Promise<boolean> {
    return this.handshakeService.checkUserExistsLocally(userId);
  }

  /**
   * Get user by internal UUID (for internal operations)
   */
  async getUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['department']
    });
  }

  /**
   * Check if user has access to a specific entity (legacy method)
   * Requirements: 8.1, 8.4 - Validate user access to entities
   */
  async hasUserAccessToEntity(userId: string, entityId: string): Promise<boolean> {
    return this.departmentService.hasUserAccessToEntity(userId, entityId);
  }

  /**
   * Find user by external userId without triggering handshake
   */
  async findByExternalUserId(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { userId },
      relations: ['department']
    });
  }

  /**
   * Find user by ID with department relationship
   * Requirements: 4.1
   */
  async findByIdWithDepartment(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['department']
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    return user;
  }

  /**
   * Update user profile
   * Requirements: 4.2, 4.3, 4.4, 4.5
   */
  async updateProfile(id: string, updateDto: UpdateUserProfileDto): Promise<User> {
    const user = await this.findByIdWithDepartment(id);

    // Validate email uniqueness if email is being updated
    if (updateDto.email && updateDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateDto.email }
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException(`Email '${updateDto.email}' is already in use`);
      }
    }

    // Validate phone uniqueness if phone is being updated
    if (updateDto.phone && updateDto.phone !== user.phone) {
      const existingUser = await this.userRepository.findOne({
        where: { phone: updateDto.phone }
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException(`Phone '${updateDto.phone}' is already in use`);
      }
    }

    // Validate department exists if departmentId is being updated
    if (updateDto.departmentId && updateDto.departmentId !== user.departmentId) {
      const department = await this.departmentService.findById(updateDto.departmentId);
      if (!department) {
        throw new NotFoundException(`Department with ID '${updateDto.departmentId}' not found`);
      }
    }

    // Update user fields
    Object.assign(user, updateDto);
    
    return await this.userRepository.save(user);
  }

  /**
   * Get entities accessible to a user based on their department assignments
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
   */
  async getUserAccessibleEntities(id: string): Promise<UserAccessibleEntitiesResponseDto> {
    const user = await this.findByIdWithDepartment(id);
    
    if (!user.departmentId) {
      return {
        entities: [],
        totalCount: 0,
      };
    }

    const entities = await this.departmentService.getUserAccessibleEntities(id);
    const primaryEntity = entities.find(entity => 
      entity.departmentAssignments?.some(assignment => assignment.isPrimary)
    );

    return {
      entities: entities.map(entity => ({
        id: entity.id,
        name: entity.name,
        kahaId: entity.kahaId,
        address: entity.address,
        radiusMeters: entity.radiusMeters,
        isPrimary: entity.departmentAssignments?.some(assignment => assignment.isPrimary) || false,
        geohash: entity.geohash,
        location: entity.location,
        avatarUrl: entity.avatarUrl,
        coverImageUrl: entity.coverImageUrl,
        description: entity.description,
      })),
      totalCount: entities.length,
      primaryEntity: primaryEntity ? {
        id: primaryEntity.id,
        name: primaryEntity.name,
        kahaId: primaryEntity.kahaId,
      } : undefined,
    };
  }

  /**
   * Check if user has access to a specific entity
   * Requirements: 8.1, 8.4
   */
  async checkEntityAccess(id: string, entityId: string): Promise<EntityAccessResponseDto> {
    const user = await this.findByIdWithDepartment(id);
    
    if (!user.departmentId) {
      return {
        hasAccess: false,
        message: 'User has no department assigned',
      };
    }

    const hasAccess = await this.departmentService.hasUserAccessToEntity(id, entityId);
    
    if (hasAccess) {
      const entity = await this.departmentService.getEntityById(entityId);
      return {
        hasAccess: true,
        message: `User has access to ${entity.name}`,
        entity: {
          id: entity.id,
          name: entity.name,
          kahaId: entity.kahaId,
        },
      };
    }

    return {
      hasAccess: false,
      message: 'User does not have access to this entity',
    };
  }

  /**
   * Get user's department access validation status
   * Requirements: 8.2, 8.3
   */
  async getUserAccessStatus(id: string): Promise<UserAccessStatusDto> {
    const user = await this.findByIdWithDepartment(id);
    
    if (!user.departmentId) {
      return {
        hasAccess: false,
        hasDepartment: false,
        departmentHasEntities: false,
        accessibleEntitiesCount: 0,
        message: 'User has no department assigned',
      };
    }

    const accessValidation = await this.departmentService.validateUserDepartmentAccess(id);
    const accessibleEntities = await this.departmentService.getUserAccessibleEntities(id);

    return {
      hasAccess: accessValidation.hasDepartment && accessValidation.hasEntities,
      hasDepartment: accessValidation.hasDepartment,
      departmentHasEntities: accessValidation.hasEntities,
      accessibleEntitiesCount: accessibleEntities.length,
      message: this.generateAccessStatusMessage(accessValidation, accessibleEntities.length),
      department: user.department ? {
        id: user.department.id,
        name: user.department.name,
        businessId: user.department.businessId,
      } : undefined,
    };
  }

  /**
   * Generate access status message
   */
  private generateAccessStatusMessage(
    validation: { hasDepartment: boolean; hasEntities: boolean },
    entitiesCount: number
  ): string {
    if (!validation.hasDepartment) {
      return 'User has no department assigned';
    }
    
    if (!validation.hasEntities) {
      return 'User\'s department has no entities assigned';
    }
    
    return `User has access to ${entitiesCount} entities through their department`;
  }
}
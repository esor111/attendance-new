import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { Department } from '../department/entities/department.entity';
import { DepartmentService } from '../department/department.service';
import { HandshakeService } from '../../service-communication/services/handshake.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<Repository<User>>;
  let departmentService: jest.Mocked<DepartmentService>;
  let handshakeService: jest.Mocked<HandshakeService>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'ext-user-123',
    name: 'Test User',
    phone: '+977-1234567890',
    email: 'test@example.com',
    address: '123 Test Street, Kathmandu',
    isFieldWorker: false,
    departmentId: 'dept-uuid-1',
    department: {
      id: 'dept-uuid-1',
      name: 'Engineering',
      businessId: 'business-uuid-1',
    } as Department,
    lastSyncedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    findAndCount: jest.fn(),
    query: jest.fn(),
  };

  const mockDepartmentService = {
    hasUserAccessToEntity: jest.fn(),
    validateUserDepartmentAccess: jest.fn(),
    getDepartmentEntities: jest.fn(),
  };

  const mockHandshakeService = {
    ensureUserExists: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: DepartmentService,
          useValue: mockDepartmentService,
        },
        {
          provide: HandshakeService,
          useValue: mockHandshakeService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
    departmentService = module.get(DepartmentService);
    handshakeService = module.get(HandshakeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserByExternalId', () => {
    it('should return user from handshake service', async () => {
      handshakeService.ensureUserExists.mockResolvedValue(mockUser);

      const result = await service.getUserByExternalId('ext-user-123');

      expect(handshakeService.ensureUserExists).toHaveBeenCalledWith('ext-user-123');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      handshakeService.ensureUserExists.mockRejectedValue(new NotFoundException());

      await expect(service.getUserByExternalId('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByExternalUserId', () => {
    it('should find user by external userId', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByExternalUserId('ext-user-123');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'ext-user-123' },
        relations: ['department'],
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByExternalUserId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByIdWithDepartment', () => {
    it('should find user by ID with department', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByIdWithDepartment(mockUser.id);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        relations: ['department'],
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findByIdWithDepartment('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    const updateDto: UpdateUserProfileDto = {
      name: 'Updated Name',
      phone: '+977-9876543210',
      email: 'updated@example.com',
      address: '456 Updated Street',
      isFieldWorker: true,
    };

    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(mockUser.id, updateDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        relations: ['department'],
      });
      expect(userRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        ...updateDto,
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfile('non-existent', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate email', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockRejectedValue({ code: '23505', constraint: 'UQ_email' });

      await expect(service.updateProfile(mockUser.id, updateDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for duplicate phone', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockRejectedValue({ code: '23505', constraint: 'UQ_phone' });

      await expect(service.updateProfile(mockUser.id, updateDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('getUserAccessibleEntities', () => {
    it('should return accessible entities for user with department', async () => {
      const mockAssignments = [
        {
          id: 'assignment-1',
          departmentId: 'dept-uuid-1',
          entityId: 'entity-uuid-1',
          isPrimary: true,
          department: mockUser.department,
          createdAt: new Date(),
          updatedAt: new Date(),
          entity: {
            id: 'entity-uuid-1',
            name: 'Main Office',
            kahaId: 'MAIN001',
            address: 'Main Street',
            radiusMeters: 100,
          },
        },
      ];

      userRepository.findOne.mockResolvedValue(mockUser);
      departmentService.getDepartmentEntities.mockResolvedValue(mockAssignments);

      const result = await service.getUserAccessibleEntities(mockUser.id);

      expect(result).toEqual({
        hasAccess: true,
        entities: mockAssignments.map(assignment => ({
          id: assignment.entity.id,
          name: assignment.entity.name,
          kahaId: assignment.entity.kahaId,
          address: assignment.entity.address,
          radiusMeters: assignment.entity.radiusMeters,
          isPrimary: assignment.isPrimary,
        })),
        totalEntities: 1,
        totalCount: 1,
      });
    });

    it('should return no access for user without department', async () => {
      const userWithoutDept = { ...mockUser, departmentId: undefined, department: undefined };
      userRepository.findOne.mockResolvedValue(userWithoutDept);

      const result = await service.getUserAccessibleEntities(mockUser.id);

      expect(result).toEqual({
        hasAccess: false,
        entities: [],
        totalEntities: 0,
        totalCount: 0,
        reason: 'User has no department assigned',
      });
    });
  });

  describe('checkEntityAccess', () => {
    it('should return access granted for valid user-entity combination', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      departmentService.hasUserAccessToEntity.mockResolvedValue(true);

      const result = await service.checkEntityAccess(mockUser.id, 'entity-uuid-1');

      expect(result).toEqual({
        hasAccess: true,
        userId: mockUser.id,
        entityId: 'entity-uuid-1',
        departmentId: mockUser.departmentId,
        message: 'Access granted',
      });
    });

    it('should return access denied for invalid user-entity combination', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      departmentService.hasUserAccessToEntity.mockResolvedValue(false);

      const result = await service.checkEntityAccess(mockUser.id, 'entity-uuid-1');

      expect(result).toEqual({
        hasAccess: false,
        userId: mockUser.id,
        entityId: 'entity-uuid-1',
        departmentId: mockUser.departmentId,
        message: 'Access denied',
        reason: 'User department has no access to this entity',
      });
    });

    it('should return access denied for user without department', async () => {
      const userWithoutDept = { ...mockUser, departmentId: undefined, department: undefined };
      userRepository.findOne.mockResolvedValue(userWithoutDept);

      const result = await service.checkEntityAccess(mockUser.id, 'entity-uuid-1');

      expect(result).toEqual({
        hasAccess: false,
        userId: mockUser.id,
        entityId: 'entity-uuid-1',
        departmentId: undefined,
        message: 'Access denied',
        reason: 'User has no department assigned',
      });
    });
  });

  describe('getUserAccessStatus', () => {
    it('should return access status for user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      departmentService.validateUserDepartmentAccess.mockResolvedValue({
        hasDepartment: true,
        hasEntities: true,
      });

      const result = await service.getUserAccessStatus(mockUser.id);

      expect(result).toEqual({
        userId: mockUser.id,
        hasDepartment: true,
        hasEntities: true,
        departmentId: mockUser.departmentId,
        departmentName: mockUser.department?.name,
        hasAccess: true,
        departmentHasEntities: true,
        accessibleEntitiesCount: 1,
        message: 'User has full access',
      });
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserAccessStatus('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // Note: findAll method would be implemented in UserService if needed
  // Removing these tests as the method doesn't exist in the current implementation
});
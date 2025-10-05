import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { Department } from '../department/entities/department.entity';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

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

  const mockUserService = {
    getUserByExternalId: jest.fn(),
    findByExternalUserId: jest.fn(),
    findByIdWithDepartment: jest.fn(),
    updateProfile: jest.fn(),
    getUserAccessibleEntities: jest.fn(),
    checkEntityAccess: jest.fn(),
    getUserAccessStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserByExternalId', () => {
    it('should return user data from handshake process', async () => {
      userService.getUserByExternalId.mockResolvedValue(mockUser);

      const result = await controller.getUserByExternalId('ext-user-123');

      expect(userService.getUserByExternalId).toHaveBeenCalledWith('ext-user-123');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      userService.getUserByExternalId.mockRejectedValue(new NotFoundException());

      await expect(controller.getUserByExternalId('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkUserExists', () => {
    it('should return existence status for existing user', async () => {
      userService.findByExternalUserId.mockResolvedValue(mockUser);

      const result = await controller.checkUserExists('ext-user-123');

      expect(result).toEqual({
        exists: true,
        userId: mockUser.userId,
        lastSyncedAt: mockUser.lastSyncedAt,
      });
    });

    it('should return false for non-existing user', async () => {
      userService.findByExternalUserId.mockResolvedValue(null);

      const result = await controller.checkUserExists('non-existent');

      expect(result).toEqual({
        exists: false,
        userId: undefined,
        lastSyncedAt: undefined,
      });
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile with department', async () => {
      userService.findByIdWithDepartment.mockResolvedValue(mockUser);

      const result = await controller.getUserProfile(mockUser.id);

      expect(userService.findByIdWithDepartment).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        phone: mockUser.phone,
        email: mockUser.email,
        address: mockUser.address,
        userId: mockUser.userId,
        isFieldWorker: mockUser.isFieldWorker,
        departmentId: mockUser.departmentId,
        lastSyncedAt: mockUser.lastSyncedAt,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        department: {
          id: mockUser.department!.id,
          name: mockUser.department!.name,
          businessId: mockUser.department!.businessId,
        },
      });
    });

    it('should return profile without department if user has no department', async () => {
      const userWithoutDept = { ...mockUser, department: undefined, departmentId: undefined };
      userService.findByIdWithDepartment.mockResolvedValue(userWithoutDept);

      const result = await controller.getUserProfile(mockUser.id);

      expect(result.department).toBeUndefined();
    });

    it('should throw NotFoundException if user not found', async () => {
      userService.findByIdWithDepartment.mockRejectedValue(new NotFoundException());

      await expect(controller.getUserProfile('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUserProfile', () => {
    const updateDto: UpdateUserProfileDto = {
      name: 'Updated Name',
      phone: '+977-9876543210',
      email: 'updated@example.com',
      address: '456 Updated Street',
      isFieldWorker: true,
    };

    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      userService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateUserProfile(mockUser.id, updateDto);

      expect(userService.updateProfile).toHaveBeenCalledWith(mockUser.id, updateDto);
      expect(result).toEqual({
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        email: updatedUser.email,
        address: updatedUser.address,
        userId: updatedUser.userId,
        isFieldWorker: updatedUser.isFieldWorker,
        departmentId: updatedUser.departmentId,
        lastSyncedAt: updatedUser.lastSyncedAt,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        department: {
          id: updatedUser.department!.id,
          name: updatedUser.department!.name,
          businessId: updatedUser.department!.businessId,
        },
      });
    });

    it('should throw ConflictException for duplicate email', async () => {
      userService.updateProfile.mockRejectedValue(new ConflictException());

      await expect(controller.updateUserProfile(mockUser.id, updateDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('getUserAccessibleEntities', () => {
    it('should return accessible entities', async () => {
      const mockResponse = {
        hasAccess: true,
        entities: [
          {
            id: 'entity-uuid-1',
            name: 'Main Office',
            kahaId: 'MAIN001',
            address: 'Main Street',
            radiusMeters: 100,
            isPrimary: true,
          },
        ],
        totalEntities: 1,
        totalCount: 1,
      };

      userService.getUserAccessibleEntities.mockResolvedValue(mockResponse);

      const result = await controller.getUserAccessibleEntities(mockUser.id);

      expect(userService.getUserAccessibleEntities).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('checkEntityAccess', () => {
    it('should return entity access status', async () => {
      const mockResponse = {
        hasAccess: true,
        userId: mockUser.id,
        entityId: 'entity-uuid-1',
        departmentId: mockUser.departmentId,
        message: 'Access granted',
      };

      userService.checkEntityAccess.mockResolvedValue(mockResponse);

      const result = await controller.checkEntityAccess(mockUser.id, 'entity-uuid-1');

      expect(userService.checkEntityAccess).toHaveBeenCalledWith(mockUser.id, 'entity-uuid-1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getUserAccessStatus', () => {
    it('should return user access status', async () => {
      const mockResponse = {
        userId: mockUser.id,
        hasDepartment: true,
        hasEntities: true,
        hasAccess: true,
        departmentId: mockUser.departmentId,
        departmentName: mockUser.department?.name,
        departmentHasEntities: true,
        accessibleEntitiesCount: 1,
        message: 'User has full access',
      };

      userService.getUserAccessStatus.mockResolvedValue(mockResponse);

      const result = await controller.getUserAccessStatus(mockUser.id);

      expect(userService.getUserAccessStatus).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockResponse);
    });
  });
});
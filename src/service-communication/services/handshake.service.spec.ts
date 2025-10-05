import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { HandshakeService } from './handshake.service';
import { User } from '../../modules/user/entities/user.entity';
import { Department } from '../../modules/department/entities/department.entity';
import { UserService as ExternalUserService } from './user.service';
import { BusinessService as ExternalBusinessService } from './business.service';

describe('HandshakeService', () => {
  let service: HandshakeService;
  let userRepository: jest.Mocked<Repository<User>>;
  let departmentRepository: jest.Mocked<Repository<Department>>;
  let externalUserService: jest.Mocked<ExternalUserService>;
  let externalBusinessService: jest.Mocked<ExternalBusinessService>;

  const mockUser: Partial<User> = {
    id: 'internal-uuid-123',
    userId: 'external-user-123',
    name: 'Test User',
    email: 'test@example.com',
    phone: '+977-12345678',
    address: 'Test Address',
    isFieldWorker: false,
    departmentId: undefined,
    department: undefined,
    lastSyncedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockExternalUserData = {
    id: 'external-user-123',
    name: 'Test User',
    email: 'test@example.com',
    avatar: 'avatar-url',
    kahaId: 'kaha-123',
  };

  const mockBusinessData = {
    id: 'external-business-123',
    name: 'Test Business',
    avatar: 'business-avatar',
    address: 'Business Address',
    kahaId: 'business-kaha-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandshakeService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Department),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ExternalUserService,
          useValue: {
            getUserData: jest.fn(),
          },
        },
        {
          provide: ExternalBusinessService,
          useValue: {
            getBusinessData: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HandshakeService>(HandshakeService);
    userRepository = module.get(getRepositoryToken(User));
    departmentRepository = module.get(getRepositoryToken(Department));
    externalUserService = module.get(ExternalUserService);
    externalBusinessService = module.get(ExternalBusinessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ensureUserExists', () => {
    it('should return existing user if found locally', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser as User);

      // Act
      const result = await service.ensureUserExists('external-user-123');

      // Assert
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'external-user-123' },
        relations: ['department'],
      });
      expect(externalUserService.getUserData).not.toHaveBeenCalled();
    });

    it('should fetch and create user if not found locally', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);
      externalUserService.getUserData.mockResolvedValue(mockExternalUserData);

      userRepository.save.mockResolvedValue(mockUser as User);

      // Act
      const result = await service.ensureUserExists('external-user-123');

      // Assert
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'external-user-123' },
        relations: ['department'],
      });
      expect(externalUserService.getUserData).toHaveBeenCalledWith('external-user-123');
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'external-user-123',
          name: 'Test User',
          email: 'test@example.com',
          lastSyncedAt: expect.any(Date),
        })
      );
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found in external service', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);
      externalUserService.getUserData.mockResolvedValue(null);

      // Act & Assert
      await expect(service.ensureUserExists('non-existent-user')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('ensureBusinessExists', () => {
    it('should return business data from external service', async () => {
      // Arrange
      externalBusinessService.getBusinessData.mockResolvedValue(mockBusinessData);

      // Act
      const result = await service.ensureBusinessExists('external-business-123');

      // Assert
      expect(result).toEqual(mockBusinessData);
      expect(externalBusinessService.getBusinessData).toHaveBeenCalledWith('external-business-123');
    });

    it('should throw NotFoundException if business not found in external service', async () => {
      // Arrange
      externalBusinessService.getBusinessData.mockResolvedValue(null);

      // Act & Assert
      await expect(service.ensureBusinessExists('non-existent-business')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('performLoginHandshake', () => {
    it('should successfully perform complete login handshake', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser as User);
      externalBusinessService.getBusinessData.mockResolvedValue(mockBusinessData);

      // Act
      const result = await service.performLoginHandshake('external-user-123', 'external-business-123');

      // Assert
      expect(result).toEqual({
        user: mockUser,
        business: mockBusinessData,
      });
    });
  });

  describe('checkUserExistsLocally', () => {
    it('should return true if user exists locally', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser as User);

      // Act
      const result = await service.checkUserExistsLocally('external-user-123');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false if user does not exist locally', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.checkUserExistsLocally('external-user-123');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('updateUserSyncTimestamp', () => {
    it('should update lastSyncedAt timestamp', async () => {
      // Arrange
      userRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.updateUserSyncTimestamp('external-user-123');

      // Assert
      expect(userRepository.update).toHaveBeenCalledWith(
        { userId: 'external-user-123' },
        { lastSyncedAt: expect.any(Date) }
      );
    });
  });
});
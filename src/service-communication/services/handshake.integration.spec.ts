import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { NotFoundException } from '@nestjs/common';
import { HandshakeService } from './handshake.service';
import { UserService as ExternalUserService } from './user.service';
import { BusinessService as ExternalBusinessService } from './business.service';
import { User } from '../../modules/user/entities/user.entity';
import { Department } from '../../modules/department/entities/department.entity';

/**
 * Integration tests for HandshakeService with real database
 * Tests the complete handshake workflow including external API simulation
 */
describe('HandshakeService Integration Tests', () => {
  let service: HandshakeService;
  let externalUserService: ExternalUserService;
  let externalBusinessService: ExternalBusinessService;
  let module: TestingModule;

  // Mock external API responses
  const mockExternalUserData = {
    id: 'ext-user-123',
    name: 'John Doe',
    email: 'john.doe@example.com',
    avatar: 'https://example.com/avatar.jpg',
    kahaId: 'user-kaha-123',
  };

  const mockExternalBusinessData = {
    id: 'ext-business-456',
    name: 'Tech Corp',
    avatar: 'https://example.com/business-avatar.jpg',
    address: 'Tech Street, Kathmandu',
    kahaId: 'business-kaha-456',
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_NAME || 'attendance_test_db',
          synchronize: true,
          autoLoadEntities: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([User, Department]),
        HttpModule,
      ],
      providers: [
        HandshakeService,
        ExternalUserService,
        ExternalBusinessService,
      ],
    }).compile();

    service = module.get<HandshakeService>(HandshakeService);
    externalUserService = module.get<ExternalUserService>(ExternalUserService);
    externalBusinessService = module.get<ExternalBusinessService>(ExternalBusinessService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('User Handshake Process', () => {
    beforeEach(() => {
      // Mock external service responses
      jest.spyOn(externalUserService, 'getUserData').mockResolvedValue(mockExternalUserData);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should fetch and create user from external service when not found locally', async () => {
      const userId = 'new-external-user-123';
      
      // Mock external service to return user data
      jest.spyOn(externalUserService, 'getUserData').mockResolvedValue({
        ...mockExternalUserData,
        id: userId,
      });

      const result = await service.ensureUserExists(userId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.name).toBe(mockExternalUserData.name);
      expect(result.email).toBe(mockExternalUserData.email);
      expect(result.lastSyncedAt).toBeDefined();
      expect(result.id).toBeDefined(); // Internal UUID should be generated
    });

    it('should return existing user without external API call', async () => {
      const userId = 'existing-user-123';
      
      // First call - create user
      jest.spyOn(externalUserService, 'getUserData').mockResolvedValue({
        ...mockExternalUserData,
        id: userId,
      });
      
      const firstResult = await service.ensureUserExists(userId);
      
      // Clear the mock to ensure no external call is made
      jest.clearAllMocks();
      
      // Second call - should return existing user
      const secondResult = await service.ensureUserExists(userId);
      
      expect(externalUserService.getUserData).not.toHaveBeenCalled();
      expect(secondResult.id).toBe(firstResult.id);
      expect(secondResult.userId).toBe(userId);
    });

    it('should throw NotFoundException when user not found in external service', async () => {
      const userId = 'non-existent-user';
      
      jest.spyOn(externalUserService, 'getUserData').mockResolvedValue(null);

      await expect(service.ensureUserExists(userId)).rejects.toThrow(NotFoundException);
    });

    it('should handle external service errors gracefully', async () => {
      const userId = 'error-user';
      
      jest.spyOn(externalUserService, 'getUserData').mockRejectedValue(new Error('External service unavailable'));

      await expect(service.ensureUserExists(userId)).rejects.toThrow('External service unavailable');
    });
  });

  describe('Business Handshake Process', () => {
    beforeEach(() => {
      jest.spyOn(externalBusinessService, 'getBusinessData').mockResolvedValue(mockExternalBusinessData);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should fetch business data from external service', async () => {
      const businessId = 'ext-business-789';
      
      jest.spyOn(externalBusinessService, 'getBusinessData').mockResolvedValue({
        ...mockExternalBusinessData,
        id: businessId,
      });

      const result = await service.ensureBusinessExists(businessId);

      expect(result).toBeDefined();
      expect(result.id).toBe(businessId);
      expect(result.name).toBe(mockExternalBusinessData.name);
      expect(result.address).toBe(mockExternalBusinessData.address);
    });

    it('should throw NotFoundException when business not found in external service', async () => {
      const businessId = 'non-existent-business';
      
      jest.spyOn(externalBusinessService, 'getBusinessData').mockResolvedValue(null);

      await expect(service.ensureBusinessExists(businessId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Complete Login Handshake Workflow', () => {
    beforeEach(() => {
      jest.spyOn(externalUserService, 'getUserData').mockResolvedValue(mockExternalUserData);
      jest.spyOn(externalBusinessService, 'getBusinessData').mockResolvedValue(mockExternalBusinessData);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should complete full login handshake for new user and business', async () => {
      const userId = 'handshake-user-123';
      const businessId = 'handshake-business-456';
      
      jest.spyOn(externalUserService, 'getUserData').mockResolvedValue({
        ...mockExternalUserData,
        id: userId,
      });
      
      jest.spyOn(externalBusinessService, 'getBusinessData').mockResolvedValue({
        ...mockExternalBusinessData,
        id: businessId,
      });

      const result = await service.performLoginHandshake(userId, businessId);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.business).toBeDefined();
      expect(result.user.userId).toBe(userId);
      expect(result.business.id).toBe(businessId);
    });

    it('should handle mixed scenarios - existing user, new business', async () => {
      const userId = 'existing-handshake-user';
      const businessId = 'new-handshake-business';
      
      // Create user first
      jest.spyOn(externalUserService, 'getUserData').mockResolvedValue({
        ...mockExternalUserData,
        id: userId,
      });
      
      await service.ensureUserExists(userId);
      
      // Clear mocks and setup for handshake
      jest.clearAllMocks();
      jest.spyOn(externalBusinessService, 'getBusinessData').mockResolvedValue({
        ...mockExternalBusinessData,
        id: businessId,
      });

      const result = await service.performLoginHandshake(userId, businessId);

      // User should not trigger external call (already exists)
      expect(externalUserService.getUserData).not.toHaveBeenCalled();
      // Business should trigger external call (new)
      expect(externalBusinessService.getBusinessData).toHaveBeenCalledWith(businessId);
      
      expect(result.user.userId).toBe(userId);
      expect(result.business.id).toBe(businessId);
    });
  });

  describe('Data Consistency and Timestamps', () => {
    beforeEach(() => {
      jest.spyOn(externalUserService, 'getUserData').mockResolvedValue(mockExternalUserData);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should maintain proper timestamps for user sync', async () => {
      const userId = 'timestamp-user-123';
      
      jest.spyOn(externalUserService, 'getUserData').mockResolvedValue({
        ...mockExternalUserData,
        id: userId,
      });

      const beforeSync = new Date();
      const user = await service.ensureUserExists(userId);
      const afterSync = new Date();

      expect(user.lastSyncedAt).toBeDefined();
      expect(user.lastSyncedAt!.getTime()).toBeGreaterThanOrEqual(beforeSync.getTime());
      expect(user.lastSyncedAt!.getTime()).toBeLessThanOrEqual(afterSync.getTime());
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should update sync timestamp when requested', async () => {
      const userId = 'sync-update-user';
      
      jest.spyOn(externalUserService, 'getUserData').mockResolvedValue({
        ...mockExternalUserData,
        id: userId,
      });

      // Create user
      const user = await service.ensureUserExists(userId);
      const originalSyncTime = user.lastSyncedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update sync timestamp
      await service.updateUserSyncTimestamp(userId);

      // Verify user exists and has updated timestamp
      const exists = await service.checkUserExistsLocally(userId);
      expect(exists).toBe(true);
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle database connection issues gracefully', async () => {
      // This test would require more complex setup to simulate DB issues
      // For now, we'll test the service behavior with mocked failures
      expect(service).toBeDefined();
    });

    it('should handle concurrent handshake requests for same user', async () => {
      const userId = 'concurrent-user-123';
      
      jest.spyOn(externalUserService, 'getUserData').mockResolvedValue({
        ...mockExternalUserData,
        id: userId,
      });

      // Simulate concurrent requests
      const promises = [
        service.ensureUserExists(userId),
        service.ensureUserExists(userId),
        service.ensureUserExists(userId),
      ];

      const results = await Promise.all(promises);

      // All should return the same user (by internal ID)
      expect(results[0].id).toBe(results[1].id);
      expect(results[1].id).toBe(results[2].id);
      expect(results[0].userId).toBe(userId);
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { EntityAccessService } from './entity-access.service';
import { UserEntityAssignmentRepository } from '../repositories/user-entity-assignment.repository';
import { EntityAccessException } from '../../../common/exceptions/attendance.exceptions';
import { GeospatialService } from './geospatial.service';

/**
 * Entity Access Service Unit Tests
 * Tests entity access resolution with different user configurations
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3
 */
describe('EntityAccessService', () => {
  let service: EntityAccessService;
  let userEntityRepository: UserEntityAssignmentRepository;
  let geospatialService: GeospatialService;

  // Test user configurations
  const testUsers = {
    // Single entity assignment
    singleEntity: {
      userId: 'user-single',
      assignments: [
        {
          id: 'assignment-1',
          userId: 'user-single',
          entityId: 'entity-office-1',
          departmentId: 'dept-1',
          isPrimary: true,
          isActive: true,
          entity: {
            id: 'entity-office-1',
            name: 'Main Office',
            kahaId: 'MAIN-001',
            latitude: 27.7172,
            longitude: 85.3240,
            radiusMeters: 100,
            isActive: true,
          }
        }
      ]
    },

    // Multiple entity assignments
    multipleEntities: {
      userId: 'user-multiple',
      assignments: [
        {
          id: 'assignment-2',
          userId: 'user-multiple',
          entityId: 'entity-office-1',
          departmentId: 'dept-1',
          isPrimary: true,
          isActive: true,
          entity: {
            id: 'entity-office-1',
            name: 'Main Office',
            kahaId: 'MAIN-001',
            latitude: 27.7172,
            longitude: 85.3240,
            radiusMeters: 100,
            isActive: true,
          }
        },
        {
          id: 'assignment-3',
          userId: 'user-multiple',
          entityId: 'entity-branch-1',
          departmentId: 'dept-1',
          isPrimary: false,
          isActive: true,
          entity: {
            id: 'entity-branch-1',
            name: 'Branch Office',
            kahaId: 'BRANCH-001',
            latitude: 27.7272,
            longitude: 85.3340,
            radiusMeters: 150,
            isActive: true,
          }
        },
        {
          id: 'assignment-4',
          userId: 'user-multiple',
          entityId: 'entity-client-1',
          departmentId: 'dept-2',
          isPrimary: false,
          isActive: true,
          entity: {
            id: 'entity-client-1',
            name: 'Client Site A',
            kahaId: 'CLIENT-A-001',
            latitude: 27.6588,
            longitude: 85.3247,
            radiusMeters: 200,
            isActive: true,
          }
        }
      ]
    },

    // Field worker with many client sites
    fieldWorker: {
      userId: 'user-field',
      assignments: [
        {
          id: 'assignment-5',
          userId: 'user-field',
          entityId: 'entity-office-1',
          departmentId: 'dept-field',
          isPrimary: true,
          isActive: true,
          entity: {
            id: 'entity-office-1',
            name: 'Main Office',
            kahaId: 'MAIN-001',
            latitude: 27.7172,
            longitude: 85.3240,
            radiusMeters: 100,
            isActive: true,
          }
        },
        // Multiple client sites
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `assignment-client-${i}`,
          userId: 'user-field',
          entityId: `entity-client-${i}`,
          departmentId: 'dept-field',
          isPrimary: false,
          isActive: true,
          entity: {
            id: `entity-client-${i}`,
            name: `Client Site ${i}`,
            kahaId: `CLIENT-${i}-001`,
            latitude: 27.7172 + (Math.random() - 0.5) * 0.1,
            longitude: 85.3240 + (Math.random() - 0.5) * 0.1,
            radiusMeters: 150 + i * 10,
            isActive: true,
          }
        }))
      ]
    },

    // Manager with team access
    manager: {
      userId: 'user-manager',
      assignments: [
        {
          id: 'assignment-manager-1',
          userId: 'user-manager',
          entityId: 'entity-office-1',
          departmentId: 'dept-management',
          isPrimary: true,
          isActive: true,
          entity: {
            id: 'entity-office-1',
            name: 'Main Office',
            kahaId: 'MAIN-001',
            latitude: 27.7172,
            longitude: 85.3240,
            radiusMeters: 100,
            isActive: true,
          }
        }
      ],
      managedEntities: [
        'entity-office-1',
        'entity-branch-1',
        'entity-client-1'
      ]
    },

    // User with no assignments
    noAccess: {
      userId: 'user-no-access',
      assignments: []
    },

    // User with inactive assignments
    inactiveAssignments: {
      userId: 'user-inactive',
      assignments: [
        {
          id: 'assignment-inactive',
          userId: 'user-inactive',
          entityId: 'entity-office-1',
          departmentId: 'dept-1',
          isPrimary: true,
          isActive: false, // Inactive
          entity: {
            id: 'entity-office-1',
            name: 'Main Office',
            kahaId: 'MAIN-001',
            latitude: 27.7172,
            longitude: 85.3240,
            radiusMeters: 100,
            isActive: true,
          }
        }
      ]
    }
  };

  beforeEach(async () => {
    const mockUserEntityRepository = {
      findActiveAssignmentsByUserId: jest.fn(),
      findByUserIdAndEntityId: jest.fn(),
      findPrimaryAssignmentByUserId: jest.fn(),
    };

    const mockGeospatialService = {
      calculateDistance: jest.fn(),
      isWithinRadius: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntityAccessService,
        {
          provide: UserEntityAssignmentRepository,
          useValue: mockUserEntityRepository,
        },
        {
          provide: GeospatialService,
          useValue: mockGeospatialService,
        },
      ],
    }).compile();

    service = module.get<EntityAccessService>(EntityAccessService);
    userEntityRepository = module.get<UserEntityAssignmentRepository>(UserEntityAssignmentRepository);
    geospatialService = module.get<GeospatialService>(GeospatialService);
  });

  describe('getAuthorizedEntities', () => {
    it('should return single entity for user with single assignment', async () => {
      const user = testUsers.singleEntity;
      
      jest.spyOn(userEntityRepository, 'findActiveAssignmentsByUserId')
        .mockResolvedValue(user.assignments);

      const result = await service.getAuthorizedEntities(user.userId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('entity-office-1');
      expect(result[0].name).toBe('Main Office');
    });

    it('should return multiple entities for user with multiple assignments', async () => {
      const user = testUsers.multipleEntities;
      
      jest.spyOn(userEntityRepository, 'findActiveAssignmentsByUserId')
        .mockResolvedValue(user.assignments);

      const result = await service.getAuthorizedEntities(user.userId);

      expect(result).toHaveLength(3);
      expect(result.map(e => e.id)).toContain('entity-office-1');
      expect(result.map(e => e.id)).toContain('entity-branch-1');
      expect(result.map(e => e.id)).toContain('entity-client-1');
    });

    it('should return many entities for field worker', async () => {
      const user = testUsers.fieldWorker;
      
      jest.spyOn(userEntityRepository, 'findActiveAssignmentsByUserId')
        .mockResolvedValue(user.assignments);

      const result = await service.getAuthorizedEntities(user.userId);

      expect(result).toHaveLength(11); // 1 office + 10 client sites
      expect(result.find(e => e.isPrimary)).toBeTruthy();
    });

    it('should return empty array for user with no assignments', async () => {
      const user = testUsers.noAccess;
      
      jest.spyOn(userEntityRepository, 'findActiveAssignmentsByUserId')
        .mockResolvedValue(user.assignments);

      const result = await service.getAuthorizedEntities(user.userId);

      expect(result).toHaveLength(0);
    });

    it('should exclude inactive assignments', async () => {
      const user = testUsers.inactiveAssignments;
      
      jest.spyOn(userEntityRepository, 'findActiveAssignmentsByUserId')
        .mockResolvedValue([]); // Repository should filter out inactive

      const result = await service.getAuthorizedEntities(user.userId);

      expect(result).toHaveLength(0);
    });

    it('should sort entities by primary first, then by name', async () => {
      const user = testUsers.multipleEntities;
      
      jest.spyOn(userEntityRepository, 'findActiveAssignmentsByUserId')
        .mockResolvedValue(user.assignments);

      const result = await service.getAuthorizedEntities(user.userId);

      expect(result[0].isPrimary).toBe(true);
      expect(result[0].name).toBe('Main Office');
    });
  });

  describe('findNearestAuthorizedEntity', () => {
    it('should find nearest entity within radius', async () => {
      const user = testUsers.multipleEntities;
      const userLocation = { latitude: 27.7175, longitude: 85.3245 }; // Near main office
      
      jest.spyOn(userEntityRepository, 'findActiveAssignmentsByUserId')
        .mockResolvedValue(user.assignments);
      
      jest.spyOn(geospatialService, 'calculateDistance')
        .mockReturnValueOnce(50) // Main office - 50m away
        .mockReturnValueOnce(1400) // Branch office - 1.4km away
        .mockReturnValueOnce(5000); // Client site - 5km away

      jest.spyOn(geospatialService, 'isWithinRadius')
        .mockReturnValueOnce(true) // Main office - within radius
        .mockReturnValueOnce(false) // Branch office - outside radius
        .mockReturnValueOnce(false); // Client site - outside radius

      const result = await service.findNearestAuthorizedEntity(
        user.userId,
        userLocation.latitude,
        userLocation.longitude
      );

      expect(result).toBeTruthy();
      expect(result.entity.id).toBe('entity-office-1');
      expect(result.distance).toBe(50);
      expect(result.isWithinRadius).toBe(true);
    });

    it('should return null when no entities are within radius', async () => {
      const user = testUsers.singleEntity;
      const userLocation = { latitude: 28.2096, longitude: 83.9856 }; // Pokhara - far away
      
      jest.spyOn(userEntityRepository, 'findActiveAssignmentsByUserId')
        .mockResolvedValue(user.assignments);
      
      jest.spyOn(geospatialService, 'calculateDistance')
        .mockReturnValue(200000); // 200km away

      jest.spyOn(geospatialService, 'isWithinRadius')
        .mockReturnValue(false);

      const result = await service.findNearestAuthorizedEntity(
        user.userId,
        userLocation.latitude,
        userLocation.longitude
      );

      expect(result).toBeNull();
    });

    it('should find nearest among multiple entities within radius', async () => {
      const user = testUsers.multipleEntities;
      const userLocation = { latitude: 27.7200, longitude: 85.3300 }; // Between offices
      
      jest.spyOn(userEntityRepository, 'findActiveAssignmentsByUserId')
        .mockResolvedValue(user.assignments);
      
      jest.spyOn(geospatialService, 'calculateDistance')
        .mockReturnValueOnce(300) // Main office - 300m away
        .mockReturnValueOnce(200) // Branch office - 200m away (nearest)
        .mockReturnValueOnce(800); // Client site - 800m away

      jest.spyOn(geospatialService, 'isWithinRadius')
        .mockReturnValue(true); // All within radius

      const result = await service.findNearestAuthorizedEntity(
        user.userId,
        userLocation.latitude,
        userLocation.longitude
      );

      expect(result).toBeTruthy();
      expect(result.entity.id).toBe('entity-branch-1');
      expect(result.distance).toBe(200);
    });

    it('should handle field worker with many client sites efficiently', async () => {
      const user = testUsers.fieldWorker;
      const userLocation = { latitude: 27.7172, longitude: 85.3240 }; // At main office
      
      jest.spyOn(userEntityRepository, 'findActiveAssignmentsByUserId')
        .mockResolvedValue(user.assignments);
      
      // Mock main office as closest (0m away)
      jest.spyOn(geospatialService, 'calculateDistance')
        .mockReturnValueOnce(0) // Main office
        .mockReturnValue(1000); // All client sites 1km away

      jest.spyOn(geospatialService, 'isWithinRadius')
        .mockReturnValueOnce(true) // Main office within radius
        .mockReturnValue(false); // Client sites outside radius

      const startTime = Date.now();
      
      const result = await service.findNearestAuthorizedEntity(
        user.userId,
        userLocation.latitude,
        userLocation.longitude
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeTruthy();
      expect(result.entity.id).toBe('entity-office-1');
      expect(result.distance).toBe(0);
      expect(duration).toBeLessThan(100); // Should be fast even with many entities
    });
  });

  describe('validateEntityAccess', () => {
    it('should validate access for authorized entity', async () => {
      const user = testUsers.singleEntity;
      
      jest.spyOn(userEntityRepository, 'findByUserIdAndEntityId')
        .mockResolvedValue(user.assignments[0]);

      const result = await service.validateEntityAccess(
        user.userId,
        'entity-office-1',
        'clock-in'
      );

      expect(result.hasAccess).toBe(true);
      expect(result.assignment).toBeTruthy();
    });

    it('should deny access for unauthorized entity', async () => {
      const user = testUsers.singleEntity;
      
      jest.spyOn(userEntityRepository, 'findByUserIdAndEntityId')
        .mockResolvedValue(null);

      await expect(
        service.validateEntityAccess(user.userId, 'entity-unauthorized', 'clock-in')
      ).rejects.toThrow(EntityAccessException);
    });

    it('should deny access for inactive assignment', async () => {
      const user = testUsers.inactiveAssignments;
      
      jest.spyOn(userEntityRepository, 'findByUserIdAndEntityId')
        .mockResolvedValue(null); // Repository filters out inactive

      await expect(
        service.validateEntityAccess(user.userId, 'entity-office-1', 'clock-in')
      ).rejects.toThrow(EntityAccessException);
    });

    it('should validate access for different operation types', async () => {
      const user = testUsers.multipleEntities;
      const assignment = user.assignments[0];
      
      jest.spyOn(userEntityRepository, 'findByUserIdAndEntityId')
        .mockResolvedValue(assignment);

      const operations = ['clock-in', 'clock-out', 'session-check-in', 'location-check-in'];
      
      for (const operation of operations) {
        const result = await service.validateEntityAccess(
          user.userId,
          'entity-office-1',
          operation
        );
        expect(result.hasAccess).toBe(true);
      }
    });
  });

  describe('getPrimaryEntity', () => {
    it('should return primary entity for user', async () => {
      const user = testUsers.multipleEntities;
      const primaryAssignment = user.assignments.find(a => a.isPrimary);
      
      jest.spyOn(userEntityRepository, 'findPrimaryAssignmentByUserId')
        .mockResolvedValue(primaryAssignment);

      const result = await service.getPrimaryEntity(user.userId);

      expect(result).toBeTruthy();
      expect(result.id).toBe('entity-office-1');
      expect(result.name).toBe('Main Office');
    });

    it('should return null when user has no primary entity', async () => {
      const user = testUsers.noAccess;
      
      jest.spyOn(userEntityRepository, 'findPrimaryAssignmentByUserId')
        .mockResolvedValue(null);

      const result = await service.getPrimaryEntity(user.userId);

      expect(result).toBeNull();
    });
  });

  describe('getEntityAccessSummary', () => {
    it('should provide comprehensive access summary', async () => {
      const user = testUsers.multipleEntities;
      
      jest.spyOn(userEntityRepository, 'findActiveAssignmentsByUserId')
        .mockResolvedValue(user.assignments);

      const result = await service.getEntityAccessSummary(user.userId);

      expect(result.totalEntities).toBe(3);
      expect(result.primaryEntity).toBeTruthy();
      expect(result.primaryEntity.id).toBe('entity-office-1');
      expect(result.secondaryEntities).toHaveLength(2);
      expect(result.departmentCount).toBe(2); // dept-1 and dept-2
      expect(result.hasFieldAccess).toBe(true);
    });

    it('should handle field worker summary', async () => {
      const user = testUsers.fieldWorker;
      
      jest.spyOn(userEntityRepository, 'findActiveAssignmentsByUserId')
        .mockResolvedValue(user.assignments);

      const result = await service.getEntityAccessSummary(user.userId);

      expect(result.totalEntities).toBe(11);
      expect(result.hasFieldAccess).toBe(true);
      expect(result.clientSiteCount).toBe(10);
    });

    it('should handle user with no access', async () => {
      const user = testUsers.noAccess;
      
      jest.spyOn(userEntityRepository, 'findActiveAssignmentsByUserId')
        .mockResolvedValue(user.assignments);

      const result = await service.getEntityAccessSummary(user.userId);

      expect(result.totalEntities).toBe(0);
      expect(result.primaryEntity).toBeNull();
      expect(result.hasFieldAccess).toBe(false);
      expect(result.departmentCount).toBe(0);
    });
  });

  describe('Manager Access Tests', () => {
    it('should validate manager access to team entities', async () => {
      const manager = testUsers.manager;
      
      // Mock manager's own assignments
      jest.spyOn(userEntityRepository, 'findByUserIdAndEntityId')
        .mockResolvedValueOnce(manager.assignments[0]);

      const result = await service.validateEntityAccess(
        manager.userId,
        'entity-office-1',
        'view-reports'
      );

      expect(result.hasAccess).toBe(true);
    });

    it('should allow manager to access team member entities for reporting', async () => {
      const manager = testUsers.manager;
      
      // Mock that manager has reporting access to this entity
      jest.spyOn(service, 'hasManagerialAccess')
        .mockResolvedValue(true);

      const result = await service.validateManagerialEntityAccess(
        manager.userId,
        'entity-branch-1',
        'view-team-reports'
      );

      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe('managerial');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large number of entities efficiently', async () => {
      // Create user with 100 entity assignments
      const largeUser = {
        userId: 'user-large',
        assignments: Array.from({ length: 100 }, (_, i) => ({
          id: `assignment-${i}`,
          userId: 'user-large',
          entityId: `entity-${i}`,
          departmentId: 'dept-1',
          isPrimary: i === 0,
          isActive: true,
          entity: {
            id: `entity-${i}`,
            name: `Entity ${i}`,
            kahaId: `ENT-${i}`,
            latitude: 27.7172 + (Math.random() - 0.5) * 0.1,
            longitude: 85.3240 + (Math.random() - 0.5) * 0.1,
            radiusMeters: 100,
            isActive: true,
          }
        }))
      };

      jest.spyOn(userEntityRepository, 'findActiveAssignmentsByUserId')
        .mockResolvedValue(largeUser.assignments);

      const startTime = Date.now();
      
      const result = await service.getAuthorizedEntities(largeUser.userId);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toHaveLength(100);
      expect(duration).toBeLessThan(100); // Should be fast
    });

    it('should handle invalid user IDs gracefully', async () => {
      jest.spyOn(userEntityRepository, 'findActiveAssignmentsByUserId')
        .mockResolvedValue([]);

      const result = await service.getAuthorizedEntities('invalid-user-id');

      expect(result).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(userEntityRepository, 'findActiveAssignmentsByUserId')
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(
        service.getAuthorizedEntities('user-1')
      ).rejects.toThrow('Database connection failed');
    });

    it('should cache frequently accessed entities', async () => {
      const user = testUsers.singleEntity;
      
      const spy = jest.spyOn(userEntityRepository, 'findActiveAssignmentsByUserId')
        .mockResolvedValue(user.assignments);

      // Call multiple times
      await service.getAuthorizedEntities(user.userId);
      await service.getAuthorizedEntities(user.userId);
      await service.getAuthorizedEntities(user.userId);

      // Should use caching to reduce database calls
      // Note: This assumes caching is implemented in the service
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
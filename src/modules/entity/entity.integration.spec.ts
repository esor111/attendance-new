import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EntityService } from './entity.service';
import { Entity } from './entities/entity.entity';
import { CreateEntityDto, ProximitySearchDto, LocationValidationDto } from './dto';

/**
 * Integration tests for EntityService with real PostGIS database
 * These tests require a PostgreSQL database with PostGIS extension
 * Run with: npm test -- --testPathPattern=entity.integration.spec.ts
 */
describe('EntityService Integration Tests', () => {
  let service: EntityService;
  let module: TestingModule;

  // Test data - Kathmandu area coordinates
  const testEntities: CreateEntityDto[] = [
    {
      name: 'Kathmandu Office',
      kahaId: 'KTM001',
      address: 'Durbar Marg, Kathmandu',
      latitude: 27.7172,
      longitude: 85.3240,
      radiusMeters: 100,
      description: 'Main office in Kathmandu',
    },
    {
      name: 'Patan Branch',
      kahaId: 'PTN001',
      address: 'Patan Durbar Square',
      latitude: 27.6734,
      longitude: 85.3250,
      radiusMeters: 150,
      description: 'Branch office in Patan',
    },
    {
      name: 'Bhaktapur Branch',
      kahaId: 'BKT001',
      address: 'Bhaktapur Durbar Square',
      latitude: 27.6710,
      longitude: 85.4298,
      radiusMeters: 200,
      description: 'Branch office in Bhaktapur',
    },
  ];

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test', // Use test environment
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
        TypeOrmModule.forFeature([Entity]),
      ],
      providers: [EntityService],
    }).compile();

    service = module.get<EntityService>(EntityService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Geospatial Operations', () => {
    let createdEntities: Entity[] = [];

    beforeEach(async () => {
      // Create test entities
      createdEntities = [];
      for (const entityDto of testEntities) {
        try {
          const entity = await service.create(entityDto);
          createdEntities.push(entity);
        } catch (error) {
          // Entity might already exist from previous test
          if (error.message.includes('already exists')) {
            const existing = await service.findByKahaId(entityDto.kahaId);
            createdEntities.push(existing);
          } else {
            throw error;
          }
        }
      }
    });

    it('should create entities with proper geohash calculation', async () => {
      expect(createdEntities).toHaveLength(3);
      
      for (const entity of createdEntities) {
        expect(entity.geohash).toBeDefined();
        expect(entity.geohash.length).toBe(8);
        expect(entity.location).toBeDefined();
        expect(entity.location.type).toBe('Point');
        expect(entity.location.coordinates).toHaveLength(2);
      }
    });

    it('should find nearby entities using PostGIS', async () => {
      const searchDto: ProximitySearchDto = {
        latitude: 27.7172, // Kathmandu center
        longitude: 85.3240,
        radiusMeters: 5000, // 5km radius
      };

      const nearbyEntities = await service.findNearby(searchDto);

      expect(nearbyEntities.length).toBeGreaterThan(0);
      expect(nearbyEntities[0]).toHaveProperty('distanceMeters');
      expect(nearbyEntities[0].distanceMeters).toBeGreaterThanOrEqual(0);
      
      // Results should be ordered by distance
      for (let i = 1; i < nearbyEntities.length; i++) {
        expect(nearbyEntities[i].distanceMeters).toBeGreaterThanOrEqual(
          nearbyEntities[i - 1].distanceMeters
        );
      }
    });

    it('should validate location within entity radius', async () => {
      const entity = createdEntities[0]; // Kathmandu Office
      
      // Test location within radius (very close to entity)
      const validLocationDto: LocationValidationDto = {
        entityId: entity.id,
        latitude: 27.7173, // Very close to entity
        longitude: 85.3241,
      };

      const validResult = await service.validateLocationWithinRadius(validLocationDto);
      
      expect(validResult.isValid).toBe(true);
      expect(validResult.distanceMeters).toBeLessThan(entity.radiusMeters);
      expect(validResult.allowedRadiusMeters).toBe(entity.radiusMeters);
      expect(validResult.entityName).toBe(entity.name);
      expect(validResult.message).toContain('Location is valid');
    });

    it('should validate location outside entity radius', async () => {
      const entity = createdEntities[0]; // Kathmandu Office
      
      // Test location outside radius (far from entity)
      const invalidLocationDto: LocationValidationDto = {
        entityId: entity.id,
        latitude: 27.8000, // Far from entity
        longitude: 85.4000,
      };

      const invalidResult = await service.validateLocationWithinRadius(invalidLocationDto);
      
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.distanceMeters).toBeGreaterThan(entity.radiusMeters);
      expect(invalidResult.allowedRadiusMeters).toBe(entity.radiusMeters);
      expect(invalidResult.entityName).toBe(entity.name);
      expect(invalidResult.message).toContain('outside the allowed');
    });

    it('should calculate accurate distances between known locations', async () => {
      // Search from Kathmandu center
      const searchDto: ProximitySearchDto = {
        latitude: 27.7172,
        longitude: 85.3240,
        radiusMeters: 10000, // 10km radius
      };

      const results = await service.findNearby(searchDto);
      const kathmandu = results.find(r => r.kahaId === 'KTM001');
      const patan = results.find(r => r.kahaId === 'PTN001');

      expect(kathmandu).toBeDefined();
      expect(patan).toBeDefined();

      // Kathmandu office should be very close (almost 0 distance)
      expect(kathmandu!.distanceMeters).toBeLessThan(100);
      
      // Patan should be approximately 5-6km away
      expect(patan!.distanceMeters).toBeGreaterThan(4000);
      expect(patan!.distanceMeters).toBeLessThan(7000);
    });
  });

  describe('Error Handling', () => {
    it('should throw ConflictException for duplicate kahaId', async () => {
      const duplicateDto: CreateEntityDto = {
        name: 'Duplicate Location',
        kahaId: 'KTM001', // Same as existing
        address: 'Different Address',
        latitude: 27.7000,
        longitude: 85.3000,
        radiusMeters: 100,
      };

      await expect(service.create(duplicateDto)).rejects.toThrow(
        'Entity with kahaId \'KTM001\' already exists'
      );
    });

    it('should throw NotFoundException for invalid entity ID in validation', async () => {
      const invalidDto: LocationValidationDto = {
        entityId: '00000000-0000-0000-0000-000000000000',
        latitude: 27.7172,
        longitude: 85.3240,
      };

      await expect(service.validateLocationWithinRadius(invalidDto)).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
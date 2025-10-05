import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityController } from './entity.controller';
import { EntityService } from './entity.service';
import { Entity } from './entities/entity.entity';
import {
  CreateEntityDto,
  UpdateEntityDto,
  ProximitySearchDto,
  NearbyEntityDto,
  LocationValidationDto,
  LocationValidationResponseDto,
} from './dto';

describe('EntityController', () => {
  let controller: EntityController;
  let entityService: jest.Mocked<EntityService>;

  const mockEntity: Entity = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Location',
    kahaId: 'TEST001',
    geohash: 'tuvz15cr',
    address: '123 Test Street',
    location: {
      type: 'Point',
      coordinates: [85.3240, 27.7172], // [lng, lat]
    },
    radiusMeters: 100,
    avatarUrl: 'https://example.com/avatar.jpg',
    coverImageUrl: 'https://example.com/cover.jpg',
    description: 'Test location description',
    departmentAssignments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEntityService = {
    create: jest.fn(),
    findNearby: jest.fn(),
    validateLocationWithinRadius: jest.fn(),
    findAllWithSummary: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByKahaId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EntityController],
      providers: [
        {
          provide: EntityService,
          useValue: mockEntityService,
        },
      ],
    }).compile();

    controller = module.get<EntityController>(EntityController);
    entityService = module.get(EntityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateEntityDto = {
      name: 'New Location',
      kahaId: 'NEW001',
      address: '456 New Street',
      latitude: 27.7172,
      longitude: 85.3240,
      radiusMeters: 150,
      avatarUrl: 'https://example.com/new-avatar.jpg',
      coverImageUrl: 'https://example.com/new-cover.jpg',
      description: 'New location description',
    };

    it('should create entity successfully', async () => {
      entityService.create.mockResolvedValue(mockEntity);

      const result = await controller.create(createDto);

      expect(entityService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual({
        id: mockEntity.id,
        name: mockEntity.name,
        kahaId: mockEntity.kahaId,
        address: mockEntity.address,
        geohash: mockEntity.geohash,
        location: mockEntity.location,
        radiusMeters: mockEntity.radiusMeters,
        avatarUrl: mockEntity.avatarUrl,
        coverImageUrl: mockEntity.coverImageUrl,
        description: mockEntity.description,
        createdAt: mockEntity.createdAt,
        updatedAt: mockEntity.updatedAt,
        departmentAssignments: [],
      });
    });

    it('should throw ConflictException for duplicate kahaId', async () => {
      entityService.create.mockRejectedValue(new ConflictException());

      await expect(controller.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findNearby', () => {
    const proximityDto: ProximitySearchDto = {
      latitude: 27.7172,
      longitude: 85.3240,
      radiusMeters: 1000,
    };

    const mockNearbyEntities: NearbyEntityDto[] = [
      {
        id: 'entity-1',
        name: 'Nearby Location 1',
        kahaId: 'NEARBY001',
        address: '789 Nearby Street',
        latitude: 27.7180,
        longitude: 85.3250,
        radiusMeters: 100,
        distanceMeters: 150,
        avatarUrl: 'https://example.com/nearby1.jpg',
        coverImageUrl: 'https://example.com/cover1.jpg',
        description: 'Nearby location 1',
      },
    ];

    it('should find nearby entities successfully', async () => {
      entityService.findNearby.mockResolvedValue(mockNearbyEntities);

      const result = await controller.findNearby(proximityDto);

      expect(entityService.findNearby).toHaveBeenCalledWith(proximityDto);
      expect(result).toEqual(mockNearbyEntities);
    });

    it('should return empty array when no nearby entities found', async () => {
      entityService.findNearby.mockResolvedValue([]);

      const result = await controller.findNearby(proximityDto);

      expect(result).toEqual([]);
    });
  });

  describe('validateLocation', () => {
    const locationDto = {
      latitude: 27.7172,
      longitude: 85.3240,
    };

    const mockValidationResponse: LocationValidationResponseDto = {
      isValid: true,
      distanceMeters: 50,
      allowedRadiusMeters: 100,
      entityName: 'Test Location',
      message: 'Location is valid. You are 50m from Test Location',
    };

    it('should validate location within radius', async () => {
      entityService.validateLocationWithinRadius.mockResolvedValue(mockValidationResponse);

      const result = await controller.validateLocation(mockEntity.id, locationDto);

      expect(entityService.validateLocationWithinRadius).toHaveBeenCalledWith({
        entityId: mockEntity.id,
        ...locationDto,
      });
      expect(result).toEqual(mockValidationResponse);
    });

    it('should return validation failure for location outside radius', async () => {
      const invalidResponse: LocationValidationResponseDto = {
        isValid: false,
        distanceMeters: 150,
        allowedRadiusMeters: 100,
        entityName: 'Test Location',
        message: 'Location is 50m outside the allowed 100m radius of Test Location',
      };

      entityService.validateLocationWithinRadius.mockResolvedValue(invalidResponse);

      const result = await controller.validateLocation(mockEntity.id, locationDto);

      expect(result).toEqual(invalidResponse);
    });

    it('should throw NotFoundException for invalid entity', async () => {
      entityService.validateLocationWithinRadius.mockRejectedValue(new NotFoundException());

      await expect(controller.validateLocation('invalid-id', locationDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated entities', async () => {
      const mockResponse = {
        entities: [mockEntity],
        total: 1,
        totalCount: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      entityService.findAllWithSummary.mockResolvedValue(mockResponse);

      const result = await controller.findAll('1', '20');

      expect(entityService.findAllWithSummary).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual(mockResponse);
    });

    it('should handle default pagination parameters', async () => {
      const mockResponse = {
        entities: [mockEntity],
        total: 1,
        totalCount: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      entityService.findAllWithSummary.mockResolvedValue(mockResponse);

      const result = await controller.findAll();

      expect(entityService.findAllWithSummary).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findById', () => {
    it('should find entity by ID', async () => {
      entityService.findById.mockResolvedValue(mockEntity);

      const result = await controller.findById(mockEntity.id);

      expect(entityService.findById).toHaveBeenCalledWith(mockEntity.id);
      expect(result).toEqual({
        id: mockEntity.id,
        name: mockEntity.name,
        kahaId: mockEntity.kahaId,
        address: mockEntity.address,
        geohash: mockEntity.geohash,
        location: mockEntity.location,
        radiusMeters: mockEntity.radiusMeters,
        avatarUrl: mockEntity.avatarUrl,
        coverImageUrl: mockEntity.coverImageUrl,
        description: mockEntity.description,
        createdAt: mockEntity.createdAt,
        updatedAt: mockEntity.updatedAt,
        departmentAssignments: [],
      });
    });

    it('should throw NotFoundException for invalid ID', async () => {
      entityService.findById.mockRejectedValue(new NotFoundException());

      await expect(controller.findById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateEntityDto = {
      name: 'Updated Location',
      address: '789 Updated Street',
      radiusMeters: 200,
    };

    it('should update entity successfully', async () => {
      const updatedEntity = { ...mockEntity, ...updateDto };
      entityService.update.mockResolvedValue(updatedEntity);

      const result = await controller.update(mockEntity.id, updateDto);

      expect(entityService.update).toHaveBeenCalledWith(mockEntity.id, updateDto);
      expect(result.name).toBe(updateDto.name);
      expect(result.address).toBe(updateDto.address);
      expect(result.radiusMeters).toBe(updateDto.radiusMeters);
    });

    it('should throw NotFoundException for invalid ID', async () => {
      entityService.update.mockRejectedValue(new NotFoundException());

      await expect(controller.update('invalid-id', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete entity successfully', async () => {
      entityService.delete.mockResolvedValue(undefined);

      await controller.delete(mockEntity.id);

      expect(entityService.delete).toHaveBeenCalledWith(mockEntity.id);
    });

    it('should throw NotFoundException for invalid ID', async () => {
      entityService.delete.mockRejectedValue(new NotFoundException());

      await expect(controller.delete('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByKahaId', () => {
    it('should find entity by kahaId', async () => {
      entityService.findByKahaId.mockResolvedValue(mockEntity);

      const result = await controller.findByKahaId(mockEntity.kahaId);

      expect(entityService.findByKahaId).toHaveBeenCalledWith(mockEntity.kahaId);
      expect(result).toEqual({
        id: mockEntity.id,
        name: mockEntity.name,
        kahaId: mockEntity.kahaId,
        address: mockEntity.address,
        geohash: mockEntity.geohash,
        location: mockEntity.location,
        radiusMeters: mockEntity.radiusMeters,
        avatarUrl: mockEntity.avatarUrl,
        coverImageUrl: mockEntity.coverImageUrl,
        description: mockEntity.description,
        createdAt: mockEntity.createdAt,
        updatedAt: mockEntity.updatedAt,
        departmentAssignments: [],
      });
    });

    it('should throw NotFoundException for invalid kahaId', async () => {
      entityService.findByKahaId.mockRejectedValue(new NotFoundException());

      await expect(controller.findByKahaId('invalid-kaha-id')).rejects.toThrow(NotFoundException);
    });
  });
});
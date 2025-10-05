import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityService } from './entity.service';
import { Entity } from './entities/entity.entity';
import { CreateEntityDto, ProximitySearchDto, LocationValidationDto } from './dto';

describe('EntityService', () => {
  let service: EntityService;
  let repository: jest.Mocked<Repository<Entity>>;

  const mockEntity: Entity = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Location',
    kahaId: 'TEST001',
    geohash: 'tuvz15cr',
    address: '123 Test Street',
    location: {
      type: 'Point',
      coordinates: [85.3240, 27.7172], // Kathmandu coordinates [lng, lat]
    },
    radiusMeters: 100,
    avatarUrl: 'https://example.com/avatar.jpg',
    coverImageUrl: 'https://example.com/cover.jpg',
    description: 'Test location description',
    departmentAssignments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntityService,
        {
          provide: getRepositoryToken(Entity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<EntityService>(EntityService);
    repository = module.get(getRepositoryToken(Entity));
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

    it('should create a new entity successfully', async () => {
      repository.findOne.mockResolvedValue(null); // No existing entity
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      const result = await service.create(createDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { kahaId: createDto.kahaId },
      });
      expect(repository.create).toHaveBeenCalledWith({
        name: createDto.name,
        kahaId: createDto.kahaId,
        address: createDto.address,
        geohash: expect.any(String), // Geohash will be calculated
        location: {
          type: 'Point',
          coordinates: [createDto.longitude, createDto.latitude],
        },
        radiusMeters: createDto.radiusMeters,
        avatarUrl: createDto.avatarUrl,
        coverImageUrl: createDto.coverImageUrl,
        description: createDto.description,
      });
      expect(repository.save).toHaveBeenCalledWith(mockEntity);
      expect(result).toEqual(mockEntity);
    });

    it('should throw ConflictException if kahaId already exists', async () => {
      repository.findOne.mockResolvedValue(mockEntity); // Existing entity found

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { kahaId: createDto.kahaId },
      });
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should calculate geohash correctly', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.create(createDto);

      const createCall = repository.create.mock.calls[0][0];
      expect(createCall.geohash).toBeDefined();
      expect(typeof createCall.geohash).toBe('string');
      expect(createCall.geohash?.length).toBe(8); // 8-character precision
    });
  });

  describe('findNearby', () => {
    const proximityDto: ProximitySearchDto = {
      latitude: 27.7172,
      longitude: 85.3240,
      radiusMeters: 1000,
    };

    const mockQueryResult = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Nearby Location',
        kahaId: 'NEARBY001',
        address: '789 Nearby Street',
        longitude: 85.3250,
        latitude: 27.7180,
        radiusMeters: 100,
        avatarUrl: 'https://example.com/nearby-avatar.jpg',
        coverImageUrl: 'https://example.com/nearby-cover.jpg',
        description: 'Nearby location',
        distanceMeters: '150.5',
      },
    ];

    it('should find nearby entities successfully', async () => {
      repository.query.mockResolvedValue(mockQueryResult);

      const result = await service.findNearby(proximityDto);

      expect(repository.query).toHaveBeenCalledWith(
        expect.stringContaining('ST_Distance'),
        expect.arrayContaining([
          expect.stringMatching(/^.{6}%$/), // Any 6-character geohash prefix
          proximityDto.radiusMeters,
        ]),
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: mockQueryResult[0].id,
        name: mockQueryResult[0].name,
        kahaId: mockQueryResult[0].kahaId,
        address: mockQueryResult[0].address,
        latitude: 27.7180,
        longitude: 85.3250,
        radiusMeters: 100,
        distanceMeters: 151, // Rounded from 150.5
        avatarUrl: mockQueryResult[0].avatarUrl,
        coverImageUrl: mockQueryResult[0].coverImageUrl,
        description: mockQueryResult[0].description,
      });
    });

    it('should return empty array when no nearby entities found', async () => {
      repository.query.mockResolvedValue([]);

      const result = await service.findNearby(proximityDto);

      expect(result).toEqual([]);
    });
  });

  describe('validateLocationWithinRadius', () => {
    const validationDto: LocationValidationDto = {
      entityId: '123e4567-e89b-12d3-a456-426614174000',
      latitude: 27.7172,
      longitude: 85.3240,
    };

    it('should validate location within radius successfully', async () => {
      repository.findOne.mockResolvedValue(mockEntity);
      repository.query
        .mockResolvedValueOnce([{ distance: '50.0' }]) // Distance query
        .mockResolvedValueOnce([{ is_within_radius: true }]); // Validation query

      const result = await service.validateLocationWithinRadius(validationDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: validationDto.entityId },
      });
      expect(result).toEqual({
        isValid: true,
        distanceMeters: 50,
        allowedRadiusMeters: mockEntity.radiusMeters,
        entityName: mockEntity.name,
        message: `Location is valid. You are 50m from ${mockEntity.name}`,
      });
    });

    it('should validate location outside radius', async () => {
      repository.findOne.mockResolvedValue(mockEntity);
      repository.query
        .mockResolvedValueOnce([{ distance: '150.0' }]) // Distance query
        .mockResolvedValueOnce([{ is_within_radius: false }]); // Validation query

      const result = await service.validateLocationWithinRadius(validationDto);

      expect(result).toEqual({
        isValid: false,
        distanceMeters: 150,
        allowedRadiusMeters: mockEntity.radiusMeters,
        entityName: mockEntity.name,
        message: `Location is 50m outside the allowed ${mockEntity.radiusMeters}m radius of ${mockEntity.name}`,
      });
    });

    it('should throw NotFoundException if entity not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.validateLocationWithinRadius(validationDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: validationDto.entityId },
      });
    });
  });

  describe('findById', () => {
    it('should find entity by ID successfully', async () => {
      repository.findOne.mockResolvedValue(mockEntity);

      const result = await service.findById(mockEntity.id);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockEntity.id },
        relations: ['departmentAssignments'],
      });
      expect(result).toEqual(mockEntity);
    });

    it('should throw NotFoundException if entity not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByKahaId', () => {
    it('should find entity by kahaId successfully', async () => {
      repository.findOne.mockResolvedValue(mockEntity);

      const result = await service.findByKahaId(mockEntity.kahaId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { kahaId: mockEntity.kahaId },
        relations: ['departmentAssignments'],
      });
      expect(result).toEqual(mockEntity);
    });

    it('should throw NotFoundException if entity not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findByKahaId('non-existent-kaha-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated entities', async () => {
      const entities = [mockEntity];
      const total = 1;
      repository.findAndCount.mockResolvedValue([entities, total]);

      const result = await service.findAll(1, 20);

      expect(repository.findAndCount).toHaveBeenCalledWith({
        relations: ['departmentAssignments'],
        skip: 0,
        take: 20,
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({ entities, total });
    });

    it('should handle pagination correctly', async () => {
      const entities = [mockEntity];
      const total = 1;
      repository.findAndCount.mockResolvedValue([entities, total]);

      await service.findAll(2, 10);

      expect(repository.findAndCount).toHaveBeenCalledWith({
        relations: ['departmentAssignments'],
        skip: 10, // (page - 1) * limit = (2 - 1) * 10
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });
  });
});
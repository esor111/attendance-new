import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as geohash from 'ngeohash';
import { Entity } from './entities/entity.entity';
import {
  CreateEntityDto,
  UpdateEntityDto,
  ProximitySearchDto,
  NearbyEntityDto,
  LocationValidationDto,
  LocationValidationResponseDto,
  EntityListResponseDto,
} from './dto';

/**
 * Entity Service - Business logic for location management
 * Handles geospatial operations, proximity searches, and location validation
 * Uses PostGIS for accurate spherical distance calculations
 */
@Injectable()
export class EntityService {
  constructor(
    @InjectRepository(Entity)
    private readonly entityRepository: Repository<Entity>,
  ) {}

  /**
   * Create a new Entity with geospatial data
   * Automatically calculates geohash and creates PostGIS point
   */
  async create(dto: CreateEntityDto): Promise<Entity> {
    // Check if kahaId already exists
    const existingEntity = await this.entityRepository.findOne({
      where: { kahaId: dto.kahaId },
    });

    if (existingEntity) {
      throw new ConflictException(`Entity with kahaId '${dto.kahaId}' already exists`);
    }

    // Calculate geohash for efficient proximity pre-filtering
    const calculatedGeohash = this.calculateGeohash(dto.latitude, dto.longitude);

    // Create PostGIS point from coordinates
    const location = {
      type: 'Point' as const,
      coordinates: [dto.longitude, dto.latitude], // PostGIS uses [lng, lat] order
    };

    const entity = this.entityRepository.create({
      name: dto.name,
      kahaId: dto.kahaId,
      address: dto.address,
      geohash: calculatedGeohash,
      location,
      radiusMeters: dto.radiusMeters,
      avatarUrl: dto.avatarUrl,
      coverImageUrl: dto.coverImageUrl,
      description: dto.description,
    });

    return await this.entityRepository.save(entity);
  }

  /**
   * Find nearby entities using PostGIS spatial queries
   * Uses geohash for initial filtering, then PostGIS for accurate distance calculation
   */
  async findNearby(dto: ProximitySearchDto): Promise<NearbyEntityDto[]> {
    const { latitude, longitude, radiusMeters } = dto;

    // Calculate geohash for the search point to filter candidates
    const searchGeohash = this.calculateGeohash(latitude, longitude);
    const geohashPrefix = searchGeohash.substring(0, 6); // Use 6-char prefix for ~1.2km precision

    // Create search point for PostGIS query
    const searchPoint = `ST_Point(${longitude}, ${latitude})::geography`;

    // Query using PostGIS ST_Distance for accurate spherical distance calculation
    const query = `
      SELECT 
        e.id,
        e.name,
        e.kaha_id as "kahaId",
        e.address,
        ST_X(e.location::geometry) as longitude,
        ST_Y(e.location::geometry) as latitude,
        e.radius_meters as "radiusMeters",
        e.avatar_url as "avatarUrl",
        e.cover_image_url as "coverImageUrl",
        e.description,
        ST_Distance(e.location, ${searchPoint}) as "distanceMeters"
      FROM entities e
      WHERE e.geohash LIKE $1
        AND ST_DWithin(e.location, ${searchPoint}, $2)
      ORDER BY ST_Distance(e.location, ${searchPoint})
      LIMIT 50
    `;

    const results = await this.entityRepository.query(query, [
      `${geohashPrefix}%`,
      radiusMeters,
    ]);

    return results.map((row: any) => ({
      id: row.id,
      name: row.name,
      kahaId: row.kahaId,
      address: row.address,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      radiusMeters: row.radiusMeters,
      distanceMeters: Math.round(parseFloat(row.distanceMeters)),
      avatarUrl: row.avatarUrl,
      coverImageUrl: row.coverImageUrl,
      description: row.description,
    }));
  }

  /**
   * Validate if a location is within an entity's allowed radius
   * Uses PostGIS ST_DWithin for accurate spherical distance validation
   */
  async validateLocationWithinRadius(dto: LocationValidationDto): Promise<LocationValidationResponseDto> {
    const { entityId, latitude, longitude } = dto;

    // Find the entity
    const entity = await this.entityRepository.findOne({
      where: { id: entityId },
    });

    if (!entity) {
      throw new NotFoundException(`Entity with ID '${entityId}' not found`);
    }

    // Create user location point for PostGIS query
    const userPoint = `ST_Point(${longitude}, ${latitude})::geography`;

    // Calculate actual distance using PostGIS
    const distanceQuery = `
      SELECT ST_Distance(location, ${userPoint}) as distance
      FROM entities
      WHERE id = $1
    `;

    const distanceResult = await this.entityRepository.query(distanceQuery, [entityId]);
    const actualDistance = Math.round(parseFloat(distanceResult[0].distance));

    // Check if location is within allowed radius using ST_DWithin
    const validationQuery = `
      SELECT ST_DWithin(location, ${userPoint}, radius_meters) as is_within_radius
      FROM entities
      WHERE id = $1
    `;

    const validationResult = await this.entityRepository.query(validationQuery, [entityId]);
    const isValid = validationResult[0].is_within_radius;

    // Generate appropriate message
    let message: string;
    if (isValid) {
      message = `Location is valid. You are ${actualDistance}m from ${entity.name}`;
    } else {
      const excessDistance = actualDistance - entity.radiusMeters;
      message = `Location is ${excessDistance}m outside the allowed ${entity.radiusMeters}m radius of ${entity.name}`;
    }

    return {
      isValid,
      distanceMeters: actualDistance,
      allowedRadiusMeters: entity.radiusMeters,
      entityName: entity.name,
      message,
    };
  }

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Entity> {
    const entity = await this.entityRepository.findOne({
      where: { id },
      relations: ['departmentAssignments'],
    });

    if (!entity) {
      throw new NotFoundException(`Entity with ID '${id}' not found`);
    }

    return entity;
  }

  /**
   * Find entity by kahaId (external identifier)
   */
  async findByKahaId(kahaId: string): Promise<Entity> {
    const entity = await this.entityRepository.findOne({
      where: { kahaId },
      relations: ['departmentAssignments'],
    });

    if (!entity) {
      throw new NotFoundException(`Entity with kahaId '${kahaId}' not found`);
    }

    return entity;
  }

  /**
   * Get all entities with pagination
   */
  async findAll(page: number = 1, limit: number = 20): Promise<{ entities: Entity[]; total: number }> {
    const [entities, total] = await this.entityRepository.findAndCount({
      relations: ['departmentAssignments'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { entities, total };
  }

  /**
   * Update an existing entity
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
   */
  async update(id: string, dto: UpdateEntityDto): Promise<Entity> {
    const entity = await this.findById(id);

    // If coordinates are being updated, recalculate geohash and location
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      const calculatedGeohash = this.calculateGeohash(dto.latitude, dto.longitude);
      const location = {
        type: 'Point' as const,
        coordinates: [dto.longitude, dto.latitude],
      };
      
      Object.assign(entity, dto, { geohash: calculatedGeohash, location });
    } else {
      Object.assign(entity, dto);
    }

    return await this.entityRepository.save(entity);
  }

  /**
   * Delete an entity
   * Requirements: 10.3
   */
  async delete(id: string): Promise<void> {
    const entity = await this.findById(id);
    await this.entityRepository.remove(entity);
  }

  /**
   * Get all entities with summary information
   * Requirements: 5.1
   */
  async findAllWithSummary(page: number, limit: number): Promise<EntityListResponseDto> {
    const queryBuilder = this.entityRepository.createQueryBuilder('e')
      .leftJoinAndSelect('e.departmentAssignments', 'da')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('e.createdAt', 'DESC');

    const [entities, totalCount] = await queryBuilder.getManyAndCount();

    return {
      entities: entities.map(entity => ({
        id: entity.id,
        name: entity.name,
        kahaId: entity.kahaId,
        address: entity.address,
        radiusMeters: entity.radiusMeters,
        assignedDepartments: entity.departmentAssignments?.length || 0,
        createdAt: entity.createdAt,
      })),
      totalCount,
    };
  }

  /**
   * Calculate geohash for efficient proximity pre-filtering
   * Uses 8-character precision (~38m accuracy) for storage
   */
  private calculateGeohash(latitude: number, longitude: number): string {
    return geohash.encode(latitude, longitude, 8);
  }
}
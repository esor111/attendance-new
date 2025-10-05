import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ValidationPipe,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EntityService } from './entity.service';
import {
  CreateEntityDto,
  UpdateEntityDto,
  ProximitySearchDto,
  NearbyEntityDto,
  LocationValidationDto,
  LocationValidationResponseDto,
  EntityResponseDto,
  EntityListResponseDto,
} from './dto';
import { Entity } from './entities/entity.entity';

/**
 * Entity Controller - REST endpoints for business location management
 * Handles creation, search, and geospatial validation operations
 * Requirements: 5.1, 6.1
 */
@Controller('entities')
export class EntityController {
  constructor(private readonly entityService: EntityService) {}

  /**
   * Create a new entity (business location)
   * POST /entities
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
   */
  @Post()
  async create(@Body(ValidationPipe) createEntityDto: CreateEntityDto): Promise<EntityResponseDto> {
    const entity = await this.entityService.create(createEntityDto);
    return this.mapToEntityResponse(entity);
  }

  /**
   * Search for nearby entities based on coordinates
   * GET /entities/nearby?latitude=27.7172&longitude=85.3240&radiusMeters=1000
   */
  @Get('nearby')
  async findNearby(@Query(ValidationPipe) proximitySearchDto: ProximitySearchDto): Promise<NearbyEntityDto[]> {
    return await this.entityService.findNearby(proximitySearchDto);
  }

  /**
   * Validate if a location is within an entity's allowed radius
   * POST /entities/:id/validate-location
   */
  @Post(':id/validate-location')
  async validateLocation(
    @Param('id', ParseUUIDPipe) entityId: string,
    @Body(ValidationPipe) locationDto: Omit<LocationValidationDto, 'entityId'>,
  ): Promise<LocationValidationResponseDto> {
    const validationDto: LocationValidationDto = {
      entityId,
      ...locationDto,
    };
    return await this.entityService.validateLocationWithinRadius(validationDto);
  }

  /**
   * Get all entities with pagination
   * GET /entities?page=1&limit=20
   * Requirements: 5.1
   */
  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<EntityListResponseDto> {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    return await this.entityService.findAllWithSummary(pageNum, limitNum);
  }

  /**
   * Get entity by ID
   * GET /entities/:id
   * Requirements: 5.1
   */
  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<EntityResponseDto> {
    const entity = await this.entityService.findById(id);
    return this.mapToEntityResponse(entity);
  }

  /**
   * Update entity
   * PUT /entities/:id
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
   */
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateEntityDto: UpdateEntityDto,
  ): Promise<EntityResponseDto> {
    const entity = await this.entityService.update(id, updateEntityDto);
    return this.mapToEntityResponse(entity);
  }

  /**
   * Delete entity
   * DELETE /entities/:id
   * Requirements: 10.3
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.entityService.delete(id);
  }

  /**
   * Get entity by kahaId (external identifier)
   * GET /entities/kaha/:kahaId
   * Requirements: 5.1
   */
  @Get('kaha/:kahaId')
  async findByKahaId(@Param('kahaId') kahaId: string): Promise<EntityResponseDto> {
    const entity = await this.entityService.findByKahaId(kahaId);
    return this.mapToEntityResponse(entity);
  }

  /**
   * Helper method to map Entity to EntityResponseDto
   */
  private mapToEntityResponse(entity: Entity): EntityResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      kahaId: entity.kahaId,
      address: entity.address,
      geohash: entity.geohash,
      location: entity.location,
      radiusMeters: entity.radiusMeters,
      avatarUrl: entity.avatarUrl,
      coverImageUrl: entity.coverImageUrl,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      departmentAssignments: entity.departmentAssignments?.map(assignment => ({
        id: assignment.id,
        departmentId: assignment.departmentId,
        isPrimary: assignment.isPrimary,
        department: assignment.department ? {
          id: assignment.department.id,
          name: assignment.department.name,
          businessId: assignment.department.businessId,
        } : undefined,
      })).filter(assignment => assignment.department !== undefined),
    };
  }
}
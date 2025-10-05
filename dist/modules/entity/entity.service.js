"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const geohash = require("ngeohash");
const entity_entity_1 = require("./entities/entity.entity");
let EntityService = class EntityService {
    constructor(entityRepository) {
        this.entityRepository = entityRepository;
    }
    async create(dto) {
        const existingEntity = await this.entityRepository.findOne({
            where: { kahaId: dto.kahaId },
        });
        if (existingEntity) {
            throw new common_1.ConflictException(`Entity with kahaId '${dto.kahaId}' already exists`);
        }
        const calculatedGeohash = this.calculateGeohash(dto.latitude, dto.longitude);
        const location = {
            type: 'Point',
            coordinates: [dto.longitude, dto.latitude],
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
    async findNearby(dto) {
        const { latitude, longitude, radiusMeters } = dto;
        const searchGeohash = this.calculateGeohash(latitude, longitude);
        const geohashPrefix = searchGeohash.substring(0, 6);
        const searchPoint = `ST_Point(${longitude}, ${latitude})::geography`;
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
        return results.map((row) => ({
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
    async validateLocationWithinRadius(dto) {
        const { entityId, latitude, longitude } = dto;
        const entity = await this.entityRepository.findOne({
            where: { id: entityId },
        });
        if (!entity) {
            throw new common_1.NotFoundException(`Entity with ID '${entityId}' not found`);
        }
        const userPoint = `ST_Point(${longitude}, ${latitude})::geography`;
        const distanceQuery = `
      SELECT ST_Distance(location, ${userPoint}) as distance
      FROM entities
      WHERE id = $1
    `;
        const distanceResult = await this.entityRepository.query(distanceQuery, [entityId]);
        const actualDistance = Math.round(parseFloat(distanceResult[0].distance));
        const validationQuery = `
      SELECT ST_DWithin(location, ${userPoint}, radius_meters) as is_within_radius
      FROM entities
      WHERE id = $1
    `;
        const validationResult = await this.entityRepository.query(validationQuery, [entityId]);
        const isValid = validationResult[0].is_within_radius;
        let message;
        if (isValid) {
            message = `Location is valid. You are ${actualDistance}m from ${entity.name}`;
        }
        else {
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
    async findById(id) {
        const entity = await this.entityRepository.findOne({
            where: { id },
            relations: ['departmentAssignments'],
        });
        if (!entity) {
            throw new common_1.NotFoundException(`Entity with ID '${id}' not found`);
        }
        return entity;
    }
    async findByKahaId(kahaId) {
        const entity = await this.entityRepository.findOne({
            where: { kahaId },
            relations: ['departmentAssignments'],
        });
        if (!entity) {
            throw new common_1.NotFoundException(`Entity with kahaId '${kahaId}' not found`);
        }
        return entity;
    }
    async findAll(page = 1, limit = 20) {
        const [entities, total] = await this.entityRepository.findAndCount({
            relations: ['departmentAssignments'],
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' },
        });
        return { entities, total };
    }
    async update(id, dto) {
        const entity = await this.findById(id);
        if (dto.latitude !== undefined && dto.longitude !== undefined) {
            const calculatedGeohash = this.calculateGeohash(dto.latitude, dto.longitude);
            const location = {
                type: 'Point',
                coordinates: [dto.longitude, dto.latitude],
            };
            Object.assign(entity, dto, { geohash: calculatedGeohash, location });
        }
        else {
            Object.assign(entity, dto);
        }
        return await this.entityRepository.save(entity);
    }
    async delete(id) {
        const entity = await this.findById(id);
        await this.entityRepository.remove(entity);
    }
    async findAllWithSummary(page, limit) {
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
    calculateGeohash(latitude, longitude) {
        return geohash.encode(latitude, longitude, 8);
    }
};
exports.EntityService = EntityService;
exports.EntityService = EntityService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entity_entity_1.Entity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], EntityService);
//# sourceMappingURL=entity.service.js.map
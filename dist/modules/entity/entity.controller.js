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
exports.EntityController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const entity_service_1 = require("./entity.service");
const dto_1 = require("./dto");
let EntityController = class EntityController {
    constructor(entityService) {
        this.entityService = entityService;
    }
    async create(createEntityDto) {
        const entity = await this.entityService.create(createEntityDto);
        return this.mapToEntityResponse(entity);
    }
    async findNearby(proximitySearchDto) {
        return await this.entityService.findNearby(proximitySearchDto);
    }
    async validateLocation(entityId, locationDto) {
        const validationDto = {
            entityId,
            ...locationDto,
        };
        return await this.entityService.validateLocationWithinRadius(validationDto);
    }
    async findAll(page = '1', limit = '20') {
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 20;
        return await this.entityService.findAllWithSummary(pageNum, limitNum);
    }
    async findById(id) {
        const entity = await this.entityService.findById(id);
        return this.mapToEntityResponse(entity);
    }
    async update(id, updateEntityDto) {
        const entity = await this.entityService.update(id, updateEntityDto);
        return this.mapToEntityResponse(entity);
    }
    async delete(id) {
        await this.entityService.delete(id);
    }
    async findByKahaId(kahaId) {
        const entity = await this.entityService.findByKahaId(kahaId);
        return this.mapToEntityResponse(entity);
    }
    mapToEntityResponse(entity) {
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
};
exports.EntityController = EntityController;
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Create new business location',
        description: 'Creates a new entity (business location) with geospatial coordinates and validation.',
    }),
    (0, swagger_1.ApiBody)({
        type: dto_1.CreateEntityDto,
        description: 'Entity creation data with coordinates and radius',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Entity created successfully',
        type: dto_1.EntityResponseDto,
    }),
    (0, swagger_1.ApiBadRequestResponse)({
        description: 'Validation failed - invalid coordinates or radius',
    }),
    (0, swagger_1.ApiConflictResponse)({
        description: 'KahaId already exists',
    }),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateEntityDto]),
    __metadata("design:returntype", Promise)
], EntityController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Find nearby entities',
        description: 'Searches for business entities within specified radius using PostGIS spatial queries.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'latitude',
        description: 'Latitude coordinate',
        example: 27.7172,
        type: Number,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'longitude',
        description: 'Longitude coordinate',
        example: 85.3240,
        type: Number,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'radiusMeters',
        description: 'Search radius in meters',
        example: 1000,
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Nearby entities found',
        type: [dto_1.NearbyEntityDto],
    }),
    (0, swagger_1.ApiBadRequestResponse)({
        description: 'Invalid coordinates or radius',
    }),
    (0, common_1.Get)('nearby'),
    __param(0, (0, common_1.Query)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.ProximitySearchDto]),
    __metadata("design:returntype", Promise)
], EntityController.prototype, "findNearby", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Validate location within entity radius',
        description: 'Validates if provided coordinates are within the entity\'s allowed check-in radius.',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Entity UUID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    (0, swagger_1.ApiBody)({
        description: 'Location coordinates to validate',
        schema: {
            type: 'object',
            properties: {
                latitude: { type: 'number', example: 27.7172 },
                longitude: { type: 'number', example: 85.3240 },
            },
            required: ['latitude', 'longitude'],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Location validation result',
        type: dto_1.LocationValidationResponseDto,
    }),
    (0, swagger_1.ApiNotFoundResponse)({
        description: 'Entity not found',
    }),
    (0, swagger_1.ApiBadRequestResponse)({
        description: 'Invalid coordinates or location outside radius',
    }),
    (0, common_1.Post)(':id/validate-location'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EntityController.prototype, "validateLocation", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EntityController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EntityController.prototype, "findById", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateEntityDto]),
    __metadata("design:returntype", Promise)
], EntityController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EntityController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)('kaha/:kahaId'),
    __param(0, (0, common_1.Param)('kahaId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EntityController.prototype, "findByKahaId", null);
exports.EntityController = EntityController = __decorate([
    (0, swagger_1.ApiTags)('entities'),
    (0, common_1.Controller)('entities'),
    __metadata("design:paramtypes", [entity_service_1.EntityService])
], EntityController);
//# sourceMappingURL=entity.controller.js.map
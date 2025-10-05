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
exports.DepartmentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const department_service_1 = require("./department.service");
const dto_1 = require("./dto");
let DepartmentController = class DepartmentController {
    constructor(departmentService) {
        this.departmentService = departmentService;
    }
    async createDepartment(createDepartmentDto) {
        return this.departmentService.create(createDepartmentDto);
    }
    async getDepartments(page = '1', limit = '20', businessId) {
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 20;
        return this.departmentService.findAll(pageNum, limitNum, businessId);
    }
    async getDepartment(id) {
        return this.departmentService.findByIdWithDetails(id);
    }
    async updateDepartment(id, updateDepartmentDto) {
        return this.departmentService.update(id, updateDepartmentDto);
    }
    async deleteDepartment(id) {
        await this.departmentService.delete(id);
    }
    async assignEntity(departmentId, assignEntityDto) {
        const assignment = await this.departmentService.assignEntityToDepartment(departmentId, assignEntityDto.entityId, assignEntityDto.isPrimary);
        return {
            id: assignment.id,
            departmentId: assignment.departmentId,
            entityId: assignment.entityId,
            isPrimary: assignment.isPrimary,
            createdAt: assignment.createdAt,
            updatedAt: assignment.updatedAt,
        };
    }
    async setPrimaryEntity(departmentId, entityId) {
        const assignment = await this.departmentService.setPrimaryEntity(departmentId, entityId);
        return {
            id: assignment.id,
            departmentId: assignment.departmentId,
            entityId: assignment.entityId,
            isPrimary: assignment.isPrimary,
            createdAt: assignment.createdAt,
            updatedAt: assignment.updatedAt,
        };
    }
    async getDepartmentEntities(departmentId) {
        const assignments = await this.departmentService.getDepartmentEntities(departmentId);
        return assignments.map(assignment => ({
            id: assignment.id,
            departmentId: assignment.departmentId,
            entityId: assignment.entityId,
            isPrimary: assignment.isPrimary,
            createdAt: assignment.createdAt,
            updatedAt: assignment.updatedAt,
            entity: assignment.entity ? {
                id: assignment.entity.id,
                name: assignment.entity.name,
                kahaId: assignment.entity.kahaId,
                address: assignment.entity.address,
                radiusMeters: assignment.entity.radiusMeters,
            } : undefined,
        }));
    }
    async removeEntityAssignment(departmentId, entityId) {
        await this.departmentService.removeEntityAssignment(departmentId, entityId);
    }
    async getDepartmentWithEntities(departmentId) {
        return this.departmentService.getDepartmentWithEntities(departmentId);
    }
};
exports.DepartmentController = DepartmentController;
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Create new department',
        description: 'Creates a new department within a business with unique name validation.',
    }),
    (0, swagger_1.ApiBody)({
        type: dto_1.CreateDepartmentDto,
        description: 'Department creation data',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Department created successfully',
        type: dto_1.DepartmentResponseDto,
    }),
    (0, swagger_1.ApiBadRequestResponse)({
        description: 'Validation failed',
    }),
    (0, swagger_1.ApiConflictResponse)({
        description: 'Department name already exists in this business',
    }),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateDepartmentDto]),
    __metadata("design:returntype", Promise)
], DepartmentController.prototype, "createDepartment", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('businessId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], DepartmentController.prototype, "getDepartments", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DepartmentController.prototype, "getDepartment", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateDepartmentDto]),
    __metadata("design:returntype", Promise)
], DepartmentController.prototype, "updateDepartment", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DepartmentController.prototype, "deleteDepartment", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Assign entity to department',
        description: 'Assigns a business entity to a department with optional primary designation.',
    }),
    (0, swagger_1.ApiParam)({
        name: 'departmentId',
        description: 'Department UUID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    (0, swagger_1.ApiBody)({
        type: dto_1.AssignEntityDto,
        description: 'Entity assignment data',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Entity assigned successfully',
        type: dto_1.DepartmentEntityResponseDto,
    }),
    (0, swagger_1.ApiNotFoundResponse)({
        description: 'Department or entity not found',
    }),
    (0, swagger_1.ApiConflictResponse)({
        description: 'Entity already assigned to this department',
    }),
    (0, common_1.Post)(':departmentId/entities'),
    __param(0, (0, common_1.Param)('departmentId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.AssignEntityDto]),
    __metadata("design:returntype", Promise)
], DepartmentController.prototype, "assignEntity", null);
__decorate([
    (0, common_1.Post)(':departmentId/entities/:entityId/set-primary'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('departmentId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('entityId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DepartmentController.prototype, "setPrimaryEntity", null);
__decorate([
    (0, common_1.Get)(':departmentId/entities'),
    __param(0, (0, common_1.Param)('departmentId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DepartmentController.prototype, "getDepartmentEntities", null);
__decorate([
    (0, common_1.Delete)(':departmentId/entities/:entityId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('departmentId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('entityId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DepartmentController.prototype, "removeEntityAssignment", null);
__decorate([
    (0, common_1.Get)(':departmentId/entities-details'),
    __param(0, (0, common_1.Param)('departmentId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DepartmentController.prototype, "getDepartmentWithEntities", null);
exports.DepartmentController = DepartmentController = __decorate([
    (0, swagger_1.ApiTags)('departments'),
    (0, common_1.Controller)('departments'),
    __metadata("design:paramtypes", [department_service_1.DepartmentService])
], DepartmentController);
//# sourceMappingURL=department.controller.js.map
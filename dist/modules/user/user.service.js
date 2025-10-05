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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
const handshake_service_1 = require("../../service-communication/services/handshake.service");
const department_service_1 = require("../department/department.service");
let UserService = class UserService {
    constructor(userRepository, handshakeService, departmentService) {
        this.userRepository = userRepository;
        this.handshakeService = handshakeService;
        this.departmentService = departmentService;
    }
    async getUserByExternalId(userId) {
        return this.handshakeService.ensureUserExists(userId);
    }
    async checkUserExistsLocally(userId) {
        return this.handshakeService.checkUserExistsLocally(userId);
    }
    async getUserById(id) {
        return this.userRepository.findOne({
            where: { id },
            relations: ['department']
        });
    }
    async hasUserAccessToEntity(userId, entityId) {
        return this.departmentService.hasUserAccessToEntity(userId, entityId);
    }
    async findByExternalUserId(userId) {
        return this.userRepository.findOne({
            where: { userId },
            relations: ['department']
        });
    }
    async findByIdWithDepartment(id) {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['department']
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID '${id}' not found`);
        }
        return user;
    }
    async updateProfile(id, updateDto) {
        const user = await this.findByIdWithDepartment(id);
        if (updateDto.email && updateDto.email !== user.email) {
            const existingUser = await this.userRepository.findOne({
                where: { email: updateDto.email }
            });
            if (existingUser && existingUser.id !== id) {
                throw new common_1.ConflictException(`Email '${updateDto.email}' is already in use`);
            }
        }
        if (updateDto.phone && updateDto.phone !== user.phone) {
            const existingUser = await this.userRepository.findOne({
                where: { phone: updateDto.phone }
            });
            if (existingUser && existingUser.id !== id) {
                throw new common_1.ConflictException(`Phone '${updateDto.phone}' is already in use`);
            }
        }
        if (updateDto.departmentId && updateDto.departmentId !== user.departmentId) {
            const department = await this.departmentService.findById(updateDto.departmentId);
            if (!department) {
                throw new common_1.NotFoundException(`Department with ID '${updateDto.departmentId}' not found`);
            }
        }
        Object.assign(user, updateDto);
        return await this.userRepository.save(user);
    }
    async getUserAccessibleEntities(id) {
        const user = await this.findByIdWithDepartment(id);
        if (!user.departmentId) {
            return {
                entities: [],
                totalCount: 0,
            };
        }
        const entities = await this.departmentService.getUserAccessibleEntities(id);
        const primaryEntity = entities.find(entity => entity.departmentAssignments?.some(assignment => assignment.isPrimary));
        return {
            entities: entities.map(entity => ({
                id: entity.id,
                name: entity.name,
                kahaId: entity.kahaId,
                address: entity.address,
                radiusMeters: entity.radiusMeters,
                isPrimary: entity.departmentAssignments?.some(assignment => assignment.isPrimary) || false,
                geohash: entity.geohash,
                location: entity.location,
                avatarUrl: entity.avatarUrl,
                coverImageUrl: entity.coverImageUrl,
                description: entity.description,
            })),
            totalCount: entities.length,
            primaryEntity: primaryEntity ? {
                id: primaryEntity.id,
                name: primaryEntity.name,
                kahaId: primaryEntity.kahaId,
            } : undefined,
        };
    }
    async checkEntityAccess(id, entityId) {
        const user = await this.findByIdWithDepartment(id);
        if (!user.departmentId) {
            return {
                hasAccess: false,
                message: 'User has no department assigned',
            };
        }
        const hasAccess = await this.departmentService.hasUserAccessToEntity(id, entityId);
        if (hasAccess) {
            const entity = await this.departmentService.getEntityById(entityId);
            return {
                hasAccess: true,
                message: `User has access to ${entity.name}`,
                entity: {
                    id: entity.id,
                    name: entity.name,
                    kahaId: entity.kahaId,
                },
            };
        }
        return {
            hasAccess: false,
            message: 'User does not have access to this entity',
        };
    }
    async getUserAccessStatus(id) {
        const user = await this.findByIdWithDepartment(id);
        if (!user.departmentId) {
            return {
                hasAccess: false,
                hasDepartment: false,
                departmentHasEntities: false,
                accessibleEntitiesCount: 0,
                message: 'User has no department assigned',
            };
        }
        const accessValidation = await this.departmentService.validateUserDepartmentAccess(id);
        const accessibleEntities = await this.departmentService.getUserAccessibleEntities(id);
        return {
            hasAccess: accessValidation.hasDepartment && accessValidation.hasEntities,
            hasDepartment: accessValidation.hasDepartment,
            departmentHasEntities: accessValidation.hasEntities,
            accessibleEntitiesCount: accessibleEntities.length,
            message: this.generateAccessStatusMessage(accessValidation, accessibleEntities.length),
            department: user.department ? {
                id: user.department.id,
                name: user.department.name,
                businessId: user.department.businessId,
            } : undefined,
        };
    }
    generateAccessStatusMessage(validation, entitiesCount) {
        if (!validation.hasDepartment) {
            return 'User has no department assigned';
        }
        if (!validation.hasEntities) {
            return 'User\'s department has no entities assigned';
        }
        return `User has access to ${entitiesCount} entities through their department`;
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        handshake_service_1.HandshakeService,
        department_service_1.DepartmentService])
], UserService);
//# sourceMappingURL=user.service.js.map
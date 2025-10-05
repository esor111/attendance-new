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
exports.DepartmentService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const department_entity_1 = require("./entities/department.entity");
const department_entity_assignment_entity_1 = require("./entities/department-entity-assignment.entity");
const entity_entity_1 = require("../entity/entities/entity.entity");
let DepartmentService = class DepartmentService {
    constructor(departmentRepository, assignmentRepository, entityRepository) {
        this.departmentRepository = departmentRepository;
        this.assignmentRepository = assignmentRepository;
        this.entityRepository = entityRepository;
    }
    async assignEntityToDepartment(departmentId, entityId, isPrimary = false) {
        const department = await this.departmentRepository.findOne({
            where: { id: departmentId },
        });
        if (!department) {
            throw new common_1.NotFoundException(`Department with ID ${departmentId} not found`);
        }
        const entity = await this.entityRepository.findOne({
            where: { id: entityId },
        });
        if (!entity) {
            throw new common_1.NotFoundException(`Entity with ID ${entityId} not found`);
        }
        const existingAssignment = await this.assignmentRepository.findOne({
            where: { departmentId, entityId },
        });
        if (existingAssignment) {
            throw new common_1.ConflictException(`Entity ${entityId} is already assigned to department ${departmentId}`);
        }
        if (isPrimary) {
            await this.ensureOnlyOnePrimaryEntity(departmentId);
        }
        const assignment = this.assignmentRepository.create({
            departmentId,
            entityId,
            isPrimary,
        });
        return await this.assignmentRepository.save(assignment);
    }
    async setPrimaryEntity(departmentId, entityId) {
        const assignment = await this.assignmentRepository.findOne({
            where: { departmentId, entityId },
        });
        if (!assignment) {
            throw new common_1.NotFoundException(`Assignment between department ${departmentId} and entity ${entityId} not found`);
        }
        await this.ensureOnlyOnePrimaryEntity(departmentId);
        assignment.isPrimary = true;
        return await this.assignmentRepository.save(assignment);
    }
    async getDepartmentEntities(departmentId) {
        const department = await this.departmentRepository.findOne({
            where: { id: departmentId },
        });
        if (!department) {
            throw new common_1.NotFoundException(`Department with ID ${departmentId} not found`);
        }
        return await this.assignmentRepository.find({
            where: { departmentId },
            relations: ['entity'],
            order: { isPrimary: 'DESC', createdAt: 'ASC' },
        });
    }
    async getUserAccessibleEntities(userId) {
        const query = `
      SELECT DISTINCT e.*
      FROM entities e
      INNER JOIN department_entity_assignments dea ON e.id = dea.entity_id
      INNER JOIN users u ON u.department_id = dea.department_id
      WHERE u.id = $1
      ORDER BY dea.is_primary DESC, e.name ASC
    `;
        const entities = await this.entityRepository.query(query, [userId]);
        return entities;
    }
    async hasUserAccessToEntity(userId, entityId) {
        const query = `
      SELECT COUNT(*) as count
      FROM department_entity_assignments dea
      INNER JOIN users u ON u.department_id = dea.department_id
      WHERE u.id = $1 AND dea.entity_id = $2
    `;
        const result = await this.assignmentRepository.query(query, [userId, entityId]);
        return parseInt(result[0].count) > 0;
    }
    async removeEntityAssignment(departmentId, entityId) {
        const assignment = await this.assignmentRepository.findOne({
            where: { departmentId, entityId },
        });
        if (!assignment) {
            throw new common_1.NotFoundException(`Assignment between department ${departmentId} and entity ${entityId} not found`);
        }
        await this.assignmentRepository.remove(assignment);
    }
    async ensureOnlyOnePrimaryEntity(departmentId) {
        await this.assignmentRepository.update({ departmentId, isPrimary: true }, { isPrimary: false });
    }
    async getDepartmentWithEntities(departmentId) {
        const department = await this.departmentRepository.findOne({
            where: { id: departmentId },
            relations: ['entityAssignments', 'entityAssignments.entity'],
        });
        if (!department) {
            throw new common_1.NotFoundException(`Department with ID ${departmentId} not found`);
        }
        return department;
    }
    async create(createDto) {
        const existingDepartment = await this.departmentRepository.findOne({
            where: { name: createDto.name, businessId: createDto.businessId }
        });
        if (existingDepartment) {
            throw new common_1.ConflictException(`Department '${createDto.name}' already exists for this business`);
        }
        const department = this.departmentRepository.create(createDto);
        const savedDepartment = await this.departmentRepository.save(department);
        return this.mapToDepartmentResponse(savedDepartment);
    }
    async findAll(page, limit, businessId) {
        const queryBuilder = this.departmentRepository.createQueryBuilder('d')
            .leftJoinAndSelect('d.users', 'u')
            .leftJoinAndSelect('d.entityAssignments', 'ea')
            .leftJoinAndSelect('ea.entity', 'e');
        if (businessId) {
            queryBuilder.where('d.businessId = :businessId', { businessId });
        }
        const [departments, totalCount] = await queryBuilder
            .skip((page - 1) * limit)
            .take(limit)
            .orderBy('d.createdAt', 'DESC')
            .getManyAndCount();
        return {
            departments: departments.map(dept => ({
                id: dept.id,
                name: dept.name,
                businessId: dept.businessId,
                userCount: dept.users?.length || 0,
                entityCount: dept.entityAssignments?.length || 0,
                primaryEntity: dept.entityAssignments?.find(ea => ea.isPrimary)?.entity ? {
                    id: dept.entityAssignments.find(ea => ea.isPrimary).entity.id,
                    name: dept.entityAssignments.find(ea => ea.isPrimary).entity.name,
                    kahaId: dept.entityAssignments.find(ea => ea.isPrimary).entity.kahaId,
                } : undefined,
            })),
            totalCount,
        };
    }
    async findById(id) {
        const department = await this.departmentRepository.findOne({
            where: { id }
        });
        if (!department) {
            throw new common_1.NotFoundException(`Department with ID '${id}' not found`);
        }
        return department;
    }
    async findByIdWithDetails(id) {
        const department = await this.departmentRepository.findOne({
            where: { id },
            relations: ['users', 'entityAssignments', 'entityAssignments.entity']
        });
        if (!department) {
            throw new common_1.NotFoundException(`Department with ID '${id}' not found`);
        }
        return this.mapToDepartmentResponse(department);
    }
    async update(id, updateDto) {
        const department = await this.findById(id);
        if (updateDto.name && updateDto.name !== department.name) {
            const existingDepartment = await this.departmentRepository.findOne({
                where: { name: updateDto.name, businessId: department.businessId }
            });
            if (existingDepartment && existingDepartment.id !== id) {
                throw new common_1.ConflictException(`Department '${updateDto.name}' already exists for this business`);
            }
        }
        Object.assign(department, updateDto);
        const savedDepartment = await this.departmentRepository.save(department);
        return this.mapToDepartmentResponse(savedDepartment);
    }
    async delete(id) {
        const department = await this.findById(id);
        await this.departmentRepository.remove(department);
    }
    async getEntityById(id) {
        const entity = await this.entityRepository.findOne({
            where: { id }
        });
        if (!entity) {
            throw new common_1.NotFoundException(`Entity with ID '${id}' not found`);
        }
        return entity;
    }
    async validateUserDepartmentAccess(userId) {
        const query = `
      SELECT 
        u.department_id IS NOT NULL as has_department,
        COUNT(dea.id) > 0 as has_entities
      FROM users u
      LEFT JOIN department_entity_assignments dea ON u.department_id = dea.department_id
      WHERE u.id = $1
      GROUP BY u.id, u.department_id
    `;
        const result = await this.assignmentRepository.query(query, [userId]);
        if (result.length === 0) {
            return { hasDepartment: false, hasEntities: false };
        }
        return {
            hasDepartment: result[0].has_department,
            hasEntities: result[0].has_entities,
        };
    }
    mapToDepartmentResponse(department) {
        return {
            id: department.id,
            name: department.name,
            businessId: department.businessId,
            createdAt: department.createdAt,
            updatedAt: department.updatedAt,
            users: department.users?.map(user => ({
                id: user.id,
                name: user.name,
                email: user.email,
                isFieldWorker: user.isFieldWorker,
            })),
            entityAssignments: department.entityAssignments?.map(assignment => ({
                id: assignment.id,
                entityId: assignment.entityId,
                isPrimary: assignment.isPrimary,
                entity: {
                    id: assignment.entity.id,
                    name: assignment.entity.name,
                    kahaId: assignment.entity.kahaId,
                    address: assignment.entity.address,
                    radiusMeters: assignment.entity.radiusMeters,
                },
            })),
        };
    }
};
exports.DepartmentService = DepartmentService;
exports.DepartmentService = DepartmentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(department_entity_1.Department)),
    __param(1, (0, typeorm_1.InjectRepository)(department_entity_assignment_entity_1.DepartmentEntityAssignment)),
    __param(2, (0, typeorm_1.InjectRepository)(entity_entity_1.Entity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], DepartmentService);
//# sourceMappingURL=department.service.js.map
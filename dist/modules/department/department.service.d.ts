import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { DepartmentEntityAssignment } from './entities/department-entity-assignment.entity';
import { Entity } from '../entity/entities/entity.entity';
import { CreateDepartmentDto, UpdateDepartmentDto, DepartmentResponseDto, DepartmentListResponseDto } from './dto';
export declare class DepartmentService {
    private readonly departmentRepository;
    private readonly assignmentRepository;
    private readonly entityRepository;
    constructor(departmentRepository: Repository<Department>, assignmentRepository: Repository<DepartmentEntityAssignment>, entityRepository: Repository<Entity>);
    assignEntityToDepartment(departmentId: string, entityId: string, isPrimary?: boolean): Promise<DepartmentEntityAssignment>;
    setPrimaryEntity(departmentId: string, entityId: string): Promise<DepartmentEntityAssignment>;
    getDepartmentEntities(departmentId: string): Promise<DepartmentEntityAssignment[]>;
    getUserAccessibleEntities(userId: string): Promise<Entity[]>;
    hasUserAccessToEntity(userId: string, entityId: string): Promise<boolean>;
    removeEntityAssignment(departmentId: string, entityId: string): Promise<void>;
    private ensureOnlyOnePrimaryEntity;
    getDepartmentWithEntities(departmentId: string): Promise<Department>;
    create(createDto: CreateDepartmentDto): Promise<DepartmentResponseDto>;
    findAll(page: number, limit: number, businessId?: string): Promise<DepartmentListResponseDto>;
    findById(id: string): Promise<Department>;
    findByIdWithDetails(id: string): Promise<DepartmentResponseDto>;
    update(id: string, updateDto: UpdateDepartmentDto): Promise<DepartmentResponseDto>;
    delete(id: string): Promise<void>;
    getEntityById(id: string): Promise<Entity>;
    validateUserDepartmentAccess(userId: string): Promise<{
        hasDepartment: boolean;
        hasEntities: boolean;
    }>;
    private mapToDepartmentResponse;
}

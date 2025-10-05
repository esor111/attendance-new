import { DepartmentService } from './department.service';
import { AssignEntityDto, DepartmentEntityResponseDto, CreateDepartmentDto, UpdateDepartmentDto, DepartmentResponseDto, DepartmentListResponseDto } from './dto';
export declare class DepartmentController {
    private readonly departmentService;
    constructor(departmentService: DepartmentService);
    createDepartment(createDepartmentDto: CreateDepartmentDto): Promise<DepartmentResponseDto>;
    getDepartments(page?: string, limit?: string, businessId?: string): Promise<DepartmentListResponseDto>;
    getDepartment(id: string): Promise<DepartmentResponseDto>;
    updateDepartment(id: string, updateDepartmentDto: UpdateDepartmentDto): Promise<DepartmentResponseDto>;
    deleteDepartment(id: string): Promise<void>;
    assignEntity(departmentId: string, assignEntityDto: AssignEntityDto): Promise<DepartmentEntityResponseDto>;
    setPrimaryEntity(departmentId: string, entityId: string): Promise<DepartmentEntityResponseDto>;
    getDepartmentEntities(departmentId: string): Promise<DepartmentEntityResponseDto[]>;
    removeEntityAssignment(departmentId: string, entityId: string): Promise<void>;
    getDepartmentWithEntities(departmentId: string): Promise<DepartmentResponseDto>;
}

import { BaseEntity } from '../../../common/entities/base.entity';
import { Department } from './department.entity';
import { Entity as BusinessEntity } from '../../entity/entities/entity.entity';
export declare class DepartmentEntityAssignment extends BaseEntity {
    departmentId: string;
    entityId: string;
    isPrimary: boolean;
    department: Department;
    entity: BusinessEntity;
}

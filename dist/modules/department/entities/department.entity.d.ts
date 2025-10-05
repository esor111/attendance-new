import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { DepartmentEntityAssignment } from './department-entity-assignment.entity';
export declare class Department extends BaseEntity {
    name: string;
    businessId: string;
    users: User[];
    entityAssignments: DepartmentEntityAssignment[];
}

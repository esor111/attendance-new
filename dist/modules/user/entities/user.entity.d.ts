import { BaseEntity } from '../../../common/entities/base.entity';
import { Department } from '../../department/entities/department.entity';
export declare class User extends BaseEntity {
    name: string;
    phone: string;
    email: string;
    address?: string;
    userId?: string;
    isFieldWorker: boolean;
    departmentId?: string;
    department: Department;
    lastSyncedAt?: Date;
}

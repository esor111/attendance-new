import { Point } from 'geojson';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DepartmentEntityAssignment } from '../../department/entities/department-entity-assignment.entity';
export declare class Entity extends BaseEntity {
    name: string;
    kahaId: string;
    geohash: string;
    address: string;
    location: Point;
    radiusMeters: number;
    avatarUrl: string;
    coverImageUrl: string;
    description: string;
    departmentAssignments: DepartmentEntityAssignment[];
}

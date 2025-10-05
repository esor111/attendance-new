export declare class AssignEntityDto {
    entityId: string;
    isPrimary?: boolean;
}
export declare class SetPrimaryEntityDto {
    entityId: string;
}
export declare class DepartmentEntityResponseDto {
    id: string;
    departmentId: string;
    entityId: string;
    isPrimary: boolean;
    createdAt: Date;
    updatedAt: Date;
    entity?: {
        id: string;
        name: string;
        kahaId: string;
        address: string;
        radiusMeters: number;
    };
}
export declare class UserAccessibleEntityDto {
    id: string;
    name: string;
    kahaId: string;
    address: string;
    radiusMeters: number;
    isPrimary: boolean;
    geohash: string;
    location: {
        type: string;
        coordinates: [number, number];
    };
}

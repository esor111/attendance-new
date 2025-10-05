export declare class EntityResponseDto {
    id: string;
    name: string;
    kahaId: string;
    address?: string;
    geohash: string;
    location: {
        type: string;
        coordinates: number[];
    };
    radiusMeters: number;
    avatarUrl?: string;
    coverImageUrl?: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
    departmentAssignments?: Array<{
        id: string;
        departmentId: string;
        isPrimary: boolean;
        department?: {
            id: string;
            name: string;
            businessId: string;
        };
    }>;
}
export declare class EntityListResponseDto {
    entities: Array<{
        id: string;
        name: string;
        kahaId: string;
        address?: string;
        radiusMeters: number;
        assignedDepartments: number;
        createdAt: Date;
    }>;
    totalCount: number;
}

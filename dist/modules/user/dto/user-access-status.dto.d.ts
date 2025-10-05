export declare class UserAccessStatusDto {
    hasAccess: boolean;
    hasDepartment: boolean;
    departmentHasEntities: boolean;
    accessibleEntitiesCount: number;
    message: string;
    department?: {
        id: string;
        name: string;
        businessId: string;
    };
}
export declare class EntityAccessResponseDto {
    hasAccess: boolean;
    message: string;
    entity?: {
        id: string;
        name: string;
        kahaId: string;
    };
}
export declare class UserAccessibleEntitiesResponseDto {
    entities: Array<{
        id: string;
        name: string;
        kahaId: string;
        address?: string;
        radiusMeters: number;
        isPrimary: boolean;
        geohash: string;
        location: {
            type: string;
            coordinates: number[];
        };
        avatarUrl?: string;
        coverImageUrl?: string;
        description?: string;
    }>;
    totalCount: number;
    primaryEntity?: {
        id: string;
        name: string;
        kahaId: string;
    };
}

export declare class DepartmentResponseDto {
    id: string;
    name: string;
    businessId: string;
    createdAt: Date;
    updatedAt: Date;
    users?: Array<{
        id: string;
        name: string;
        email: string;
        isFieldWorker: boolean;
    }>;
    entityAssignments?: Array<{
        id: string;
        entityId: string;
        isPrimary: boolean;
        entity: {
            id: string;
            name: string;
            kahaId: string;
            address?: string;
            radiusMeters: number;
        };
    }>;
}
export declare class DepartmentListResponseDto {
    departments: Array<{
        id: string;
        name: string;
        businessId: string;
        userCount: number;
        entityCount: number;
        primaryEntity?: {
            id: string;
            name: string;
            kahaId: string;
        };
    }>;
    totalCount: number;
}

export declare class UserProfileResponseDto {
    id: string;
    name: string;
    phone: string;
    email: string;
    address?: string;
    userId?: string;
    isFieldWorker: boolean;
    departmentId?: string;
    lastSyncedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    department?: {
        id: string;
        name: string;
        businessId: string;
    };
}
export declare class UserExistsResponseDto {
    exists: boolean;
    userId?: string;
    lastSyncedAt?: Date;
}

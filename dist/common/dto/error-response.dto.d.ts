export declare class ErrorResponseDto {
    statusCode: number;
    message: string;
    errors?: Array<{
        field: string;
        message: string;
        value?: any;
    }>;
    timestamp: string;
    path: string;
    method: string;
}
export declare class LocationValidationErrorDto extends ErrorResponseDto {
    details: {
        actualDistance: number;
        requiredRadius: number;
        entityName: string;
    };
}
export declare class EntityAccessDeniedErrorDto extends ErrorResponseDto {
    details: {
        userId: string;
        entityId: string;
        reason: string;
    };
}

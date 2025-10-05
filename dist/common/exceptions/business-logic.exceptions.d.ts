import { HttpException } from '@nestjs/common';
export declare class LocationValidationException extends HttpException {
    constructor(actualDistance: number, requiredRadius: number, entityName: string);
}
export declare class EntityAccessDeniedException extends HttpException {
    constructor(userId: string, entityId: string, reason: string);
}
export declare class DepartmentAssignmentException extends HttpException {
    constructor(message: string, details?: any);
}
export declare class ExternalServiceException extends HttpException {
    constructor(serviceName: string, operation: string, originalError?: any);
}
export declare class DataIntegrityException extends HttpException {
    constructor(message: string, entity: string, operation: string);
}
export declare class GeospatialValidationException extends HttpException {
    constructor(message: string, coordinates?: {
        latitude: number;
        longitude: number;
    });
}
export declare class AttendanceStateException extends HttpException {
    constructor(currentState: string, attemptedAction: string, userId: string, customMessage?: string);
    private static getSuggestions;
}
export declare class FraudDetectionException extends HttpException {
    constructor(fraudType: string, details: {
        travelSpeed?: number;
        distance?: number;
        timeMinutes?: number;
        threshold?: number;
    });
    private static buildMessage;
}
export declare class ConcurrentOperationException extends HttpException {
    constructor(userId: string, operationType: string);
}
export declare class ReferentialIntegrityException extends HttpException {
    constructor(entity: string, entityId: string, referencedEntity: string, referencedId: string);
}

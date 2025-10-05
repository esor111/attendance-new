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

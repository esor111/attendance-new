"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeospatialValidationException = exports.DataIntegrityException = exports.ExternalServiceException = exports.DepartmentAssignmentException = exports.EntityAccessDeniedException = exports.LocationValidationException = void 0;
const common_1 = require("@nestjs/common");
class LocationValidationException extends common_1.HttpException {
    constructor(actualDistance, requiredRadius, entityName) {
        const message = `Location validation failed. You are ${actualDistance.toFixed(2)}m away from ${entityName}, but must be within ${requiredRadius}m radius.`;
        super({
            message,
            error: 'Location Validation Failed',
            details: {
                actualDistance: Math.round(actualDistance * 100) / 100,
                requiredRadius,
                entityName,
            },
        }, common_1.HttpStatus.BAD_REQUEST);
    }
}
exports.LocationValidationException = LocationValidationException;
class EntityAccessDeniedException extends common_1.HttpException {
    constructor(userId, entityId, reason) {
        const message = `Access denied to entity. ${reason}`;
        super({
            message,
            error: 'Entity Access Denied',
            details: {
                userId,
                entityId,
                reason,
            },
        }, common_1.HttpStatus.FORBIDDEN);
    }
}
exports.EntityAccessDeniedException = EntityAccessDeniedException;
class DepartmentAssignmentException extends common_1.HttpException {
    constructor(message, details) {
        super({
            message,
            error: 'Department Assignment Error',
            ...(details && { details }),
        }, common_1.HttpStatus.CONFLICT);
    }
}
exports.DepartmentAssignmentException = DepartmentAssignmentException;
class ExternalServiceException extends common_1.HttpException {
    constructor(serviceName, operation, originalError) {
        const message = `Failed to ${operation} from ${serviceName}`;
        super({
            message,
            error: 'External Service Error',
            details: {
                serviceName,
                operation,
                ...(originalError && { originalError: originalError.message }),
            },
        }, common_1.HttpStatus.BAD_GATEWAY);
    }
}
exports.ExternalServiceException = ExternalServiceException;
class DataIntegrityException extends common_1.HttpException {
    constructor(message, entity, operation) {
        super({
            message,
            error: 'Data Integrity Violation',
            details: {
                entity,
                operation,
            },
        }, common_1.HttpStatus.CONFLICT);
    }
}
exports.DataIntegrityException = DataIntegrityException;
class GeospatialValidationException extends common_1.HttpException {
    constructor(message, coordinates) {
        super({
            message,
            error: 'Geospatial Validation Error',
            ...(coordinates && { details: { coordinates } }),
        }, common_1.HttpStatus.BAD_REQUEST);
    }
}
exports.GeospatialValidationException = GeospatialValidationException;
//# sourceMappingURL=business-logic.exceptions.js.map
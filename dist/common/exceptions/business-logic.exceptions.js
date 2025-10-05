"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferentialIntegrityException = exports.ConcurrentOperationException = exports.FraudDetectionException = exports.AttendanceStateException = exports.GeospatialValidationException = exports.DataIntegrityException = exports.ExternalServiceException = exports.DepartmentAssignmentException = exports.EntityAccessDeniedException = exports.LocationValidationException = void 0;
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
class AttendanceStateException extends common_1.HttpException {
    constructor(currentState, attemptedAction, userId) {
        const message = `Cannot ${attemptedAction} in current state: ${currentState}`;
        super({
            message,
            error: 'Invalid Attendance State',
            details: {
                currentState,
                attemptedAction,
                userId,
                suggestions: AttendanceStateException.getSuggestions(currentState, attemptedAction),
            },
        }, common_1.HttpStatus.CONFLICT);
    }
    static getSuggestions(currentState, attemptedAction) {
        const suggestions = [];
        if (attemptedAction === 'clock-out' && currentState === 'not_clocked_in') {
            suggestions.push('Please clock-in first before attempting to clock-out');
        }
        else if (attemptedAction === 'clock-in' && currentState === 'already_clocked_in') {
            suggestions.push('You are already clocked in for today');
            suggestions.push('Use session check-in for breaks or meetings');
        }
        else if (attemptedAction === 'session-check-in' && currentState === 'no_daily_attendance') {
            suggestions.push('Please clock-in for daily attendance before starting a session');
        }
        else if (attemptedAction === 'session-check-out' && currentState === 'no_active_session') {
            suggestions.push('No active session found to check out from');
        }
        return suggestions;
    }
}
exports.AttendanceStateException = AttendanceStateException;
class FraudDetectionException extends common_1.HttpException {
    constructor(fraudType, details) {
        const message = FraudDetectionException.buildMessage(fraudType, details);
        super({
            message,
            error: 'Suspicious Activity Detected',
            details: {
                fraudType,
                ...details,
                timestamp: new Date().toISOString(),
            },
        }, common_1.HttpStatus.BAD_REQUEST);
    }
    static buildMessage(fraudType, details) {
        switch (fraudType) {
            case 'impossible_travel_speed':
                return `Impossible travel speed detected: ${Math.round(details.travelSpeed)}km/h over ${Math.round(details.distance)}m in ${Math.round(details.timeMinutes)} minutes`;
            case 'suspicious_location_pattern':
                return `Suspicious location pattern detected: repeated use of flagged location`;
            case 'time_anomaly':
                return `Time anomaly detected: unusual timing pattern`;
            default:
                return `Suspicious activity detected: ${fraudType}`;
        }
    }
}
exports.FraudDetectionException = FraudDetectionException;
class ConcurrentOperationException extends common_1.HttpException {
    constructor(userId, operationType) {
        const message = `Concurrent ${operationType} operation detected for user. Please wait and try again.`;
        super({
            message,
            error: 'Concurrent Operation Conflict',
            details: {
                userId,
                operationType,
                retryAfter: 5,
            },
        }, common_1.HttpStatus.CONFLICT);
    }
}
exports.ConcurrentOperationException = ConcurrentOperationException;
class ReferentialIntegrityException extends common_1.HttpException {
    constructor(entity, entityId, referencedEntity, referencedId) {
        const message = `Referential integrity violation: ${entity} ${entityId} references non-existent ${referencedEntity} ${referencedId}`;
        super({
            message,
            error: 'Referential Integrity Violation',
            details: {
                entity,
                entityId,
                referencedEntity,
                referencedId,
            },
        }, common_1.HttpStatus.BAD_REQUEST);
    }
}
exports.ReferentialIntegrityException = ReferentialIntegrityException;
//# sourceMappingURL=business-logic.exceptions.js.map
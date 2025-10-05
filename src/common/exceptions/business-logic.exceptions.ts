import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Custom Business Logic Exceptions
 * Provides specific error types for business rule violations
 * Requirements: 9.5, 10.1, 10.2
 */

export class LocationValidationException extends HttpException {
  constructor(
    actualDistance: number,
    requiredRadius: number,
    entityName: string,
  ) {
    const message = `Location validation failed. You are ${actualDistance.toFixed(2)}m away from ${entityName}, but must be within ${requiredRadius}m radius.`;
    super(
      {
        message,
        error: 'Location Validation Failed',
        details: {
          actualDistance: Math.round(actualDistance * 100) / 100,
          requiredRadius,
          entityName,
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class EntityAccessDeniedException extends HttpException {
  constructor(userId: string, entityId: string, reason: string) {
    const message = `Access denied to entity. ${reason}`;
    super(
      {
        message,
        error: 'Entity Access Denied',
        details: {
          userId,
          entityId,
          reason,
        },
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class DepartmentAssignmentException extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        message,
        error: 'Department Assignment Error',
        ...(details && { details }),
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class ExternalServiceException extends HttpException {
  constructor(serviceName: string, operation: string, originalError?: any) {
    const message = `Failed to ${operation} from ${serviceName}`;
    super(
      {
        message,
        error: 'External Service Error',
        details: {
          serviceName,
          operation,
          ...(originalError && { originalError: originalError.message }),
        },
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}

export class DataIntegrityException extends HttpException {
  constructor(message: string, entity: string, operation: string) {
    super(
      {
        message,
        error: 'Data Integrity Violation',
        details: {
          entity,
          operation,
        },
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class GeospatialValidationException extends HttpException {
  constructor(message: string, coordinates?: { latitude: number; longitude: number }) {
    super(
      {
        message,
        error: 'Geospatial Validation Error',
        ...(coordinates && { details: { coordinates } }),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class AttendanceStateException extends HttpException {
  constructor(currentState: string, attemptedAction: string, userId: string) {
    const message = `Cannot ${attemptedAction} in current state: ${currentState}`;
    super(
      {
        message,
        error: 'Invalid Attendance State',
        details: {
          currentState,
          attemptedAction,
          userId,
          suggestions: AttendanceStateException.getSuggestions(currentState, attemptedAction),
        },
      },
      HttpStatus.CONFLICT,
    );
  }

  private static getSuggestions(currentState: string, attemptedAction: string): string[] {
    const suggestions: string[] = [];
    
    if (attemptedAction === 'clock-out' && currentState === 'not_clocked_in') {
      suggestions.push('Please clock-in first before attempting to clock-out');
    } else if (attemptedAction === 'clock-in' && currentState === 'already_clocked_in') {
      suggestions.push('You are already clocked in for today');
      suggestions.push('Use session check-in for breaks or meetings');
    } else if (attemptedAction === 'session-check-in' && currentState === 'no_daily_attendance') {
      suggestions.push('Please clock-in for daily attendance before starting a session');
    } else if (attemptedAction === 'session-check-out' && currentState === 'no_active_session') {
      suggestions.push('No active session found to check out from');
    }
    
    return suggestions;
  }
}

export class FraudDetectionException extends HttpException {
  constructor(
    fraudType: string,
    details: {
      travelSpeed?: number;
      distance?: number;
      timeMinutes?: number;
      threshold?: number;
    },
  ) {
    const message = FraudDetectionException.buildMessage(fraudType, details);
    super(
      {
        message,
        error: 'Suspicious Activity Detected',
        details: {
          fraudType,
          ...details,
          timestamp: new Date().toISOString(),
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  private static buildMessage(fraudType: string, details: any): string {
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

export class ConcurrentOperationException extends HttpException {
  constructor(userId: string, operationType: string) {
    const message = `Concurrent ${operationType} operation detected for user. Please wait and try again.`;
    super(
      {
        message,
        error: 'Concurrent Operation Conflict',
        details: {
          userId,
          operationType,
          retryAfter: 5, // seconds
        },
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class ReferentialIntegrityException extends HttpException {
  constructor(
    entity: string,
    entityId: string,
    referencedEntity: string,
    referencedId: string,
  ) {
    const message = `Referential integrity violation: ${entity} ${entityId} references non-existent ${referencedEntity} ${referencedId}`;
    super(
      {
        message,
        error: 'Referential Integrity Violation',
        details: {
          entity,
          entityId,
          referencedEntity,
          referencedId,
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
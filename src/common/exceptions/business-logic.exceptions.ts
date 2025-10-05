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
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Attendance-Specific Exception Classes
 * Provides detailed error handling for attendance operations
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.1, 9.2, 9.6, 9.7
 */

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
      suggestions.push('Check if you have already clocked in today');
    } else if (attemptedAction === 'clock-in' && currentState === 'already_clocked_in') {
      suggestions.push('You are already clocked in for today');
      suggestions.push('Use session check-in for breaks or meetings');
      suggestions.push('If you need to clock-out, use the clock-out endpoint');
    } else if (attemptedAction === 'session-check-in' && currentState === 'no_daily_attendance') {
      suggestions.push('Please clock-in for daily attendance before starting a session');
      suggestions.push('Daily attendance is required before session management');
    } else if (attemptedAction === 'session-check-out' && currentState === 'no_active_session') {
      suggestions.push('No active session found to check out from');
      suggestions.push('Use session check-in first to start a session');
    } else if (attemptedAction === 'session-check-in' && currentState === 'active_session_exists') {
      suggestions.push('You already have an active session');
      suggestions.push('Please check out from current session first');
    } else if (attemptedAction === 'location-check-in' && currentState === 'no_daily_attendance') {
      suggestions.push('Please clock-in for daily attendance before location check-in');
      suggestions.push('Field worker location logging requires active daily attendance');
    } else if (attemptedAction === 'location-check-in' && currentState === 'active_location_exists') {
      suggestions.push('You already have an active location check-in');
      suggestions.push('Please check out from current location first');
    } else if (attemptedAction === 'location-check-out' && currentState === 'no_active_location') {
      suggestions.push('No active location check-in found');
      suggestions.push('Use location check-in first to start tracking');
    }
    
    return suggestions;
  }
}

export class DuplicateAttendanceException extends HttpException {
  constructor(userId: string, date: string) {
    const message = `Attendance record already exists for user on ${date}`;
    super(
      {
        message,
        error: 'Duplicate Attendance Record',
        details: {
          userId,
          date,
          suggestions: [
            'Check if you have already clocked in today',
            'Use session check-in for breaks during the day',
            'Contact support if you believe this is an error',
          ],
        },
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidClockOutException extends HttpException {
  constructor(userId: string, reason: string) {
    const message = `Cannot clock out: ${reason}`;
    super(
      {
        message,
        error: 'Invalid Clock Out',
        details: {
          userId,
          reason,
          suggestions: [
            'Ensure you have clocked in today',
            'Check if you have any active sessions to close first',
            'Verify your location is within the allowed radius',
          ],
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class SessionManagementException extends HttpException {
  constructor(operation: string, reason: string, userId: string) {
    const message = `Session ${operation} failed: ${reason}`;
    super(
      {
        message,
        error: 'Session Management Error',
        details: {
          operation,
          reason,
          userId,
          suggestions: SessionManagementException.getSuggestions(operation, reason),
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  private static getSuggestions(operation: string, reason: string): string[] {
    const suggestions: string[] = [];
    
    if (operation === 'check-in' && reason.includes('active session')) {
      suggestions.push('Check out from your current session first');
      suggestions.push('Use GET /api/attendance/session/current to see active session');
    } else if (operation === 'check-out' && reason.includes('no active session')) {
      suggestions.push('Start a session with session check-in first');
      suggestions.push('Verify you have an active daily attendance record');
    } else if (reason.includes('location')) {
      suggestions.push('Ensure you are within the required radius of your work location');
      suggestions.push('Check your GPS accuracy and try again');
    }
    
    return suggestions;
  }
}

export class LocationLogException extends HttpException {
  constructor(operation: string, reason: string, userId: string, entityId?: string) {
    const message = `Location ${operation} failed: ${reason}`;
    super(
      {
        message,
        error: 'Location Log Error',
        details: {
          operation,
          reason,
          userId,
          ...(entityId && { entityId }),
          suggestions: LocationLogException.getSuggestions(operation, reason),
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  private static getSuggestions(operation: string, reason: string): string[] {
    const suggestions: string[] = [];
    
    if (operation === 'check-in' && reason.includes('active location')) {
      suggestions.push('Check out from your current location first');
      suggestions.push('Use GET /api/attendance/location/current to see active location');
    } else if (operation === 'check-out' && reason.includes('no active location')) {
      suggestions.push('Start location tracking with location check-in first');
      suggestions.push('Verify you have an active daily attendance record');
    } else if (reason.includes('entity access')) {
      suggestions.push('Ensure you have access to the specified entity');
      suggestions.push('Contact your manager to verify entity assignments');
    } else if (reason.includes('daily attendance')) {
      suggestions.push('Clock in for daily attendance before location tracking');
      suggestions.push('Field worker features require active daily attendance');
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
      previousLocation?: { latitude: number; longitude: number };
      currentLocation?: { latitude: number; longitude: number };
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
          flagged: true,
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  private static buildMessage(fraudType: string, details: any): string {
    switch (fraudType) {
      case 'impossible_travel_speed':
        return `Impossible travel speed detected: ${Math.round(details.travelSpeed)}km/h over ${Math.round(details.distance)}m in ${Math.round(details.timeMinutes)} minutes (threshold: ${details.threshold}km/h)`;
      case 'suspicious_location_pattern':
        return `Suspicious location pattern detected: repeated use of flagged location`;
      case 'time_anomaly':
        return `Time anomaly detected: unusual timing pattern for attendance operation`;
      case 'location_spoofing':
        return `Potential location spoofing detected: coordinates appear manipulated`;
      case 'rapid_location_changes':
        return `Rapid location changes detected: multiple locations in short time period`;
      default:
        return `Suspicious activity detected: ${fraudType}`;
    }
  }
}

export class EntityAccessException extends HttpException {
  constructor(userId: string, entityId: string, operation: string, reason: string) {
    const message = `Entity access denied for ${operation}: ${reason}`;
    super(
      {
        message,
        error: 'Entity Access Denied',
        details: {
          userId,
          entityId,
          operation,
          reason,
          suggestions: [
            'Verify you have been assigned to this entity',
            'Check with your manager about entity access permissions',
            'Ensure your department has access to this entity',
            'Contact support if you believe you should have access',
          ],
        },
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class GeospatialCalculationException extends HttpException {
  constructor(operation: string, coordinates: any, reason: string) {
    const message = `Geospatial calculation failed for ${operation}: ${reason}`;
    super(
      {
        message,
        error: 'Geospatial Calculation Error',
        details: {
          operation,
          coordinates,
          reason,
          suggestions: [
            'Verify coordinate values are within valid ranges',
            'Check GPS accuracy and try again',
            'Ensure location services are enabled',
            'Try moving to an area with better GPS signal',
          ],
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ConcurrentAttendanceException extends HttpException {
  constructor(userId: string, operationType: string, conflictingOperation?: string) {
    const message = `Concurrent ${operationType} operation detected. ${conflictingOperation ? `Conflicting with: ${conflictingOperation}` : 'Please wait and try again.'}`;
    super(
      {
        message,
        error: 'Concurrent Operation Conflict',
        details: {
          userId,
          operationType,
          ...(conflictingOperation && { conflictingOperation }),
          retryAfter: 5, // seconds
          suggestions: [
            'Wait a few seconds and try again',
            'Ensure you are not performing multiple attendance operations simultaneously',
            'Check if another device is being used for attendance',
          ],
        },
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class AttendanceValidationException extends HttpException {
  constructor(field: string, value: any, rule: string, expectedValue?: any) {
    const message = `Validation failed for ${field}: ${rule}`;
    super(
      {
        message,
        error: 'Attendance Validation Error',
        details: {
          field,
          value,
          rule,
          ...(expectedValue !== undefined && { expectedValue }),
          suggestions: AttendanceValidationException.getSuggestions(field, rule),
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  private static getSuggestions(field: string, rule: string): string[] {
    const suggestions: string[] = [];
    
    if (field.includes('coordinate') || field.includes('latitude') || field.includes('longitude')) {
      suggestions.push('Ensure GPS is enabled and has good signal');
      suggestions.push('Check that coordinates are within valid ranges');
      suggestions.push('Try refreshing your location');
    } else if (field.includes('time') || field.includes('date')) {
      suggestions.push('Verify your device time is correct');
      suggestions.push('Check timezone settings');
    } else if (field.includes('radius') || field.includes('distance')) {
      suggestions.push('Move closer to your designated work location');
      suggestions.push('Contact your manager if the radius seems incorrect');
    } else if (field.includes('session') || field.includes('type')) {
      suggestions.push('Use valid session types: work, break, lunch, meeting, errand');
      suggestions.push('Ensure session operations are performed in correct order');
    }
    
    return suggestions;
  }
}

export class ReportingAccessException extends HttpException {
  constructor(managerId: string, employeeId: string, operation: string) {
    const message = `Access denied: Manager cannot ${operation} for employee`;
    super(
      {
        message,
        error: 'Reporting Access Denied',
        details: {
          managerId,
          employeeId,
          operation,
          suggestions: [
            'Verify the employee reports to you',
            'Check if reporting relationship is active',
            'Ensure you have manager permissions',
            'Contact HR if reporting structure needs updating',
          ],
        },
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
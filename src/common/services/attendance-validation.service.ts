import { Injectable } from '@nestjs/common';
import { 
  AttendanceStateException,
  AttendanceValidationException,
  GeospatialCalculationException,
  FraudDetectionException 
} from '../exceptions/attendance.exceptions';

/**
 * Attendance Validation Service - Specialized validation for attendance operations
 * Provides comprehensive business rule validation for attendance workflows
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.3, 3.1, 3.2, 7.1, 7.2, 7.3, 7.4, 7.5
 */
@Injectable()
export class AttendanceValidationService {
  
  /**
   * Validate attendance state for clock-in operation
   * Requirements: 1.1, 1.3
   */
  validateClockInState(existingAttendance: any, userId: string): void {
    if (existingAttendance && existingAttendance.clockInTime) {
      throw new AttendanceStateException(
        'already_clocked_in',
        'clock-in',
        userId
      );
    }
  }

  /**
   * Validate attendance state for clock-out operation
   * Requirements: 1.4
   */
  validateClockOutState(attendance: any, userId: string): void {
    if (!attendance || !attendance.clockInTime) {
      throw new AttendanceStateException(
        'not_clocked_in',
        'clock-out',
        userId
      );
    }

    if (attendance.clockOutTime) {
      throw new AttendanceStateException(
        'already_clocked_out',
        'clock-out',
        userId
      );
    }
  }

  /**
   * Validate session check-in state
   * Requirements: 3.1, 3.3
   */
  validateSessionCheckInState(
    dailyAttendance: any, 
    activeSession: any, 
    userId: string
  ): void {
    if (!dailyAttendance || !dailyAttendance.clockInTime) {
      throw new AttendanceStateException(
        'no_daily_attendance',
        'session-check-in',
        userId
      );
    }

    if (activeSession && !activeSession.checkOutTime) {
      throw new AttendanceStateException(
        'active_session_exists',
        'session-check-in',
        userId
      );
    }
  }

  /**
   * Validate session check-out state
   * Requirements: 3.4, 3.5
   */
  validateSessionCheckOutState(activeSession: any, userId: string): void {
    if (!activeSession || activeSession.checkOutTime) {
      throw new AttendanceStateException(
        'no_active_session',
        'session-check-out',
        userId
      );
    }
  }

  /**
   * Validate location check-in state for field workers
   * Requirements: 4.1, 4.3
   */
  validateLocationCheckInState(
    dailyAttendance: any,
    activeLocation: any,
    userId: string
  ): void {
    if (!dailyAttendance || !dailyAttendance.clockInTime) {
      throw new AttendanceStateException(
        'no_daily_attendance',
        'location-check-in',
        userId
      );
    }

    if (activeLocation && !activeLocation.checkOutTime) {
      throw new AttendanceStateException(
        'active_location_exists',
        'location-check-in',
        userId
      );
    }
  }

  /**
   * Validate location check-out state for field workers
   * Requirements: 4.4
   */
  validateLocationCheckOutState(activeLocation: any, userId: string): void {
    if (!activeLocation || activeLocation.checkOutTime) {
      throw new AttendanceStateException(
        'no_active_location',
        'location-check-out',
        userId
      );
    }
  }

  /**
   * Validate coordinate precision and format
   * Requirements: 2.1, 2.2
   */
  validateCoordinatePrecision(latitude: number, longitude: number): void {
    // Check for reasonable precision (not too many decimal places indicating potential spoofing)
    const latStr = latitude.toString();
    const lngStr = longitude.toString();
    
    const latDecimals = latStr.includes('.') ? latStr.split('.')[1].length : 0;
    const lngDecimals = lngStr.includes('.') ? lngStr.split('.')[1].length : 0;

    if (latDecimals > 8 || lngDecimals > 8) {
      throw new AttendanceValidationException(
        'coordinates',
        { latitude, longitude },
        'excessive precision detected - potential spoofing',
        'maximum 8 decimal places'
      );
    }

    // Check for obviously fake coordinates (e.g., 0,0 or repeated digits)
    if ((latitude === 0 && longitude === 0) || 
        this.hasRepeatedDigits(latStr) || 
        this.hasRepeatedDigits(lngStr)) {
      throw new AttendanceValidationException(
        'coordinates',
        { latitude, longitude },
        'suspicious coordinate pattern detected'
      );
    }
  }

  /**
   * Validate travel speed for fraud detection
   * Requirements: 7.1, 7.2
   */
  validateTravelSpeed(
    distance: number,
    timeMinutes: number,
    threshold: number = 200,
    previousLocation?: { latitude: number; longitude: number },
    currentLocation?: { latitude: number; longitude: number }
  ): void {
    if (timeMinutes <= 0) {
      throw new GeospatialCalculationException(
        'travel speed calculation',
        { previousLocation, currentLocation, timeMinutes },
        'invalid time duration'
      );
    }

    const speedKmh = (distance / 1000) / (timeMinutes / 60);

    if (speedKmh > threshold) {
      throw new FraudDetectionException(
        'impossible_travel_speed',
        {
          travelSpeed: speedKmh,
          distance,
          timeMinutes,
          threshold,
          previousLocation,
          currentLocation
        }
      );
    }
  }

  /**
   * Validate location within entity radius
   * Requirements: 2.3, 2.4
   */
  validateLocationRadius(
    actualDistance: number,
    requiredRadius: number,
    entityName: string,
    strict: boolean = true
  ): void {
    if (actualDistance > requiredRadius) {
      if (strict) {
        throw new AttendanceValidationException(
          'location_radius',
          actualDistance,
          `location is ${actualDistance.toFixed(2)}m away from ${entityName}, required within ${requiredRadius}m`,
          requiredRadius
        );
      } else {
        // For non-strict mode, we might just flag it but allow the operation
        // This could be used for warnings vs hard failures
      }
    }
  }

  /**
   * Validate session type
   * Requirements: 3.8
   */
  validateSessionType(sessionType: string): void {
    const validTypes = ['work', 'break', 'lunch', 'meeting', 'errand'];
    
    if (!validTypes.includes(sessionType)) {
      throw new AttendanceValidationException(
        'sessionType',
        sessionType,
        `must be one of: ${validTypes.join(', ')}`,
        validTypes
      );
    }
  }

  /**
   * Validate time constraints for attendance operations
   * Requirements: 9.1, 9.2
   */
  validateTimeConstraints(
    operationType: string,
    currentTime: Date,
    lastOperationTime?: Date,
    minimumIntervalMinutes: number = 1
  ): void {
    if (lastOperationTime) {
      const timeDiffMinutes = (currentTime.getTime() - lastOperationTime.getTime()) / (1000 * 60);
      
      if (timeDiffMinutes < minimumIntervalMinutes) {
        throw new AttendanceValidationException(
          'operation_timing',
          timeDiffMinutes,
          `minimum ${minimumIntervalMinutes} minutes required between ${operationType} operations`,
          minimumIntervalMinutes
        );
      }
    }
  }

  /**
   * Validate business hours for attendance operations
   * Requirements: 9.3, 9.4
   */
  validateBusinessHours(
    operationType: string,
    currentTime: Date,
    businessStartHour: number = 6,
    businessEndHour: number = 22
  ): void {
    const hour = currentTime.getHours();
    
    if (hour < businessStartHour || hour > businessEndHour) {
      throw new AttendanceValidationException(
        'business_hours',
        hour,
        `${operationType} outside business hours (${businessStartHour}:00 - ${businessEndHour}:00)`,
        `${businessStartHour}:00 - ${businessEndHour}:00`
      );
    }
  }

  /**
   * Validate total work hours don't exceed limits
   * Requirements: 9.5, 9.6
   */
  validateWorkHours(totalHours: number, maxHours: number = 16): void {
    if (totalHours > maxHours) {
      throw new AttendanceValidationException(
        'total_hours',
        totalHours,
        `exceeds maximum allowed work hours per day`,
        maxHours
      );
    }

    if (totalHours < 0) {
      throw new AttendanceValidationException(
        'total_hours',
        totalHours,
        'cannot be negative'
      );
    }
  }

  /**
   * Validate entity access permissions
   * Requirements: 5.1, 5.2, 5.3, 5.4
   */
  validateEntityAccess(
    userId: string,
    entityId: string,
    authorizedEntities: string[],
    operation: string
  ): void {
    if (!authorizedEntities.includes(entityId)) {
      throw new AttendanceValidationException(
        'entity_access',
        entityId,
        `user ${userId} does not have access to entity for ${operation}`,
        authorizedEntities
      );
    }
  }

  /**
   * Helper method to detect repeated digits in coordinates (potential spoofing)
   */
  private hasRepeatedDigits(value: string): boolean {
    // Remove decimal point and check for patterns like 111111 or 123123123
    const digits = value.replace('.', '').replace('-', '');
    
    // Check for more than 4 consecutive identical digits
    const consecutivePattern = /(\d)\1{4,}/;
    if (consecutivePattern.test(digits)) {
      return true;
    }

    // Check for simple repeating patterns
    const simplePatterns = ['123456', '111111', '000000', '999999'];
    return simplePatterns.some(pattern => digits.includes(pattern));
  }

  /**
   * Validate concurrent operation prevention
   * Requirements: 9.6, 9.7
   */
  validateConcurrentOperations(
    userId: string,
    operationType: string,
    activeOperations: string[]
  ): void {
    const conflictingOperations = activeOperations.filter(op => 
      this.areOperationsConflicting(operationType, op)
    );

    if (conflictingOperations.length > 0) {
      throw new AttendanceValidationException(
        'concurrent_operations',
        operationType,
        `conflicts with active operations: ${conflictingOperations.join(', ')}`,
        'complete existing operations first'
      );
    }
  }

  /**
   * Check if two operations conflict with each other
   */
  private areOperationsConflicting(operation1: string, operation2: string): boolean {
    const conflictMap: Record<string, string[]> = {
      'clock-in': ['clock-in'],
      'clock-out': ['clock-out'],
      'session-check-in': ['session-check-in'],
      'session-check-out': ['session-check-out'],
      'location-check-in': ['location-check-in'],
      'location-check-out': ['location-check-out']
    };

    return conflictMap[operation1]?.includes(operation2) || false;
  }
}
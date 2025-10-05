import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceValidationService } from './attendance-validation.service';
import { 
  AttendanceStateException,
  AttendanceValidationException,
  FraudDetectionException 
} from '../exceptions/attendance.exceptions';

/**
 * Attendance Validation Service Unit Tests
 * Tests attendance state management and validation rules
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.3, 3.1, 3.2, 7.1, 7.2, 7.3, 7.4, 7.5
 */
describe('AttendanceValidationService', () => {
  let service: AttendanceValidationService;

  // Test data for various attendance states
  const testAttendanceStates = {
    notClockedIn: null,
    clockedIn: {
      id: 'attendance-1',
      userId: 'user-1',
      date: '2024-01-15',
      clockInTime: new Date('2024-01-15T09:00:00Z'),
      clockOutTime: null,
      totalHours: null,
    },
    clockedOut: {
      id: 'attendance-2',
      userId: 'user-1',
      date: '2024-01-15',
      clockInTime: new Date('2024-01-15T09:00:00Z'),
      clockOutTime: new Date('2024-01-15T17:00:00Z'),
      totalHours: 8,
    },
    activeSession: {
      id: 'session-1',
      userId: 'user-1',
      attendanceId: 'attendance-1',
      sessionType: 'work',
      checkInTime: new Date('2024-01-15T10:00:00Z'),
      checkOutTime: null,
    },
    completedSession: {
      id: 'session-2',
      userId: 'user-1',
      attendanceId: 'attendance-1',
      sessionType: 'break',
      checkInTime: new Date('2024-01-15T10:00:00Z'),
      checkOutTime: new Date('2024-01-15T10:15:00Z'),
    },
    activeLocation: {
      id: 'location-1',
      userId: 'user-1',
      attendanceId: 'attendance-1',
      entityId: 'entity-1',
      checkInTime: new Date('2024-01-15T11:00:00Z'),
      checkOutTime: null,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AttendanceValidationService],
    }).compile();

    service = module.get<AttendanceValidationService>(AttendanceValidationService);
  });

  describe('validateClockInState', () => {
    it('should allow clock-in when user has not clocked in', () => {
      expect(() => {
        service.validateClockInState(testAttendanceStates.notClockedIn, 'user-1');
      }).not.toThrow();
    });

    it('should prevent clock-in when user is already clocked in', () => {
      expect(() => {
        service.validateClockInState(testAttendanceStates.clockedIn, 'user-1');
      }).toThrow(AttendanceStateException);
    });

    it('should allow clock-in when user has clocked out (new day)', () => {
      expect(() => {
        service.validateClockInState(testAttendanceStates.clockedOut, 'user-1');
      }).not.toThrow();
    });

    it('should provide helpful suggestions in exception', () => {
      try {
        service.validateClockInState(testAttendanceStates.clockedIn, 'user-1');
      } catch (error) {
        expect(error).toBeInstanceOf(AttendanceStateException);
        expect(error.getResponse().details.suggestions).toContain('You are already clocked in for today');
        expect(error.getResponse().details.suggestions).toContain('Use session check-in for breaks or meetings');
      }
    });
  });

  describe('validateClockOutState', () => {
    it('should allow clock-out when user is clocked in', () => {
      expect(() => {
        service.validateClockOutState(testAttendanceStates.clockedIn, 'user-1');
      }).not.toThrow();
    });

    it('should prevent clock-out when user has not clocked in', () => {
      expect(() => {
        service.validateClockOutState(testAttendanceStates.notClockedIn, 'user-1');
      }).toThrow(AttendanceStateException);
    });

    it('should prevent clock-out when user is already clocked out', () => {
      expect(() => {
        service.validateClockOutState(testAttendanceStates.clockedOut, 'user-1');
      }).toThrow(AttendanceStateException);
    });

    it('should provide helpful suggestions for clock-out errors', () => {
      try {
        service.validateClockOutState(testAttendanceStates.notClockedIn, 'user-1');
      } catch (error) {
        expect(error).toBeInstanceOf(AttendanceStateException);
        expect(error.getResponse().details.suggestions).toContain('Please clock-in first before attempting to clock-out');
      }
    });
  });

  describe('validateSessionCheckInState', () => {
    it('should allow session check-in when user is clocked in and has no active session', () => {
      expect(() => {
        service.validateSessionCheckInState(
          testAttendanceStates.clockedIn,
          null,
          'user-1'
        );
      }).not.toThrow();
    });

    it('should allow session check-in when previous session is completed', () => {
      expect(() => {
        service.validateSessionCheckInState(
          testAttendanceStates.clockedIn,
          testAttendanceStates.completedSession,
          'user-1'
        );
      }).not.toThrow();
    });

    it('should prevent session check-in when user has not clocked in', () => {
      expect(() => {
        service.validateSessionCheckInState(
          testAttendanceStates.notClockedIn,
          null,
          'user-1'
        );
      }).toThrow(AttendanceStateException);
    });

    it('should prevent session check-in when user has active session', () => {
      expect(() => {
        service.validateSessionCheckInState(
          testAttendanceStates.clockedIn,
          testAttendanceStates.activeSession,
          'user-1'
        );
      }).toThrow(AttendanceStateException);
    });

    it('should provide helpful suggestions for session errors', () => {
      try {
        service.validateSessionCheckInState(
          testAttendanceStates.notClockedIn,
          null,
          'user-1'
        );
      } catch (error) {
        expect(error).toBeInstanceOf(AttendanceStateException);
        expect(error.getResponse().details.suggestions).toContain('Please clock-in for daily attendance before starting a session');
      }
    });
  });

  describe('validateSessionCheckOutState', () => {
    it('should allow session check-out when user has active session', () => {
      expect(() => {
        service.validateSessionCheckOutState(testAttendanceStates.activeSession, 'user-1');
      }).not.toThrow();
    });

    it('should prevent session check-out when no active session', () => {
      expect(() => {
        service.validateSessionCheckOutState(null, 'user-1');
      }).toThrow(AttendanceStateException);
    });

    it('should prevent session check-out when session is already completed', () => {
      expect(() => {
        service.validateSessionCheckOutState(testAttendanceStates.completedSession, 'user-1');
      }).toThrow(AttendanceStateException);
    });
  });

  describe('validateLocationCheckInState', () => {
    it('should allow location check-in when user is clocked in and has no active location', () => {
      expect(() => {
        service.validateLocationCheckInState(
          testAttendanceStates.clockedIn,
          null,
          'user-1'
        );
      }).not.toThrow();
    });

    it('should prevent location check-in when user has not clocked in', () => {
      expect(() => {
        service.validateLocationCheckInState(
          testAttendanceStates.notClockedIn,
          null,
          'user-1'
        );
      }).toThrow(AttendanceStateException);
    });

    it('should prevent location check-in when user has active location', () => {
      expect(() => {
        service.validateLocationCheckInState(
          testAttendanceStates.clockedIn,
          testAttendanceStates.activeLocation,
          'user-1'
        );
      }).toThrow(AttendanceStateException);
    });
  });

  describe('validateCoordinatePrecision', () => {
    it('should allow normal coordinate precision', () => {
      expect(() => {
        service.validateCoordinatePrecision(27.7172, 85.3240);
      }).not.toThrow();
    });

    it('should allow reasonable high precision', () => {
      expect(() => {
        service.validateCoordinatePrecision(27.71720001, 85.32400001);
      }).not.toThrow();
    });

    it('should flag excessive precision (potential spoofing)', () => {
      expect(() => {
        service.validateCoordinatePrecision(27.717200000001, 85.324000000001);
      }).toThrow(AttendanceValidationException);
    });

    it('should flag suspicious coordinate patterns', () => {
      // Null Island (0,0)
      expect(() => {
        service.validateCoordinatePrecision(0, 0);
      }).toThrow(AttendanceValidationException);

      // Repeated digits
      expect(() => {
        service.validateCoordinatePrecision(1.111111, 2.222222);
      }).toThrow(AttendanceValidationException);
    });

    it('should handle edge cases near coordinate boundaries', () => {
      // Near poles
      expect(() => {
        service.validateCoordinatePrecision(89.9999, 179.9999);
      }).not.toThrow();

      // Near date line
      expect(() => {
        service.validateCoordinatePrecision(0, 179.9999);
      }).not.toThrow();
    });
  });

  describe('validateTravelSpeed', () => {
    it('should allow normal walking speed', () => {
      expect(() => {
        service.validateTravelSpeed(500, 10, 200); // 500m in 10min = 3km/h
      }).not.toThrow();
    });

    it('should allow normal driving speed', () => {
      expect(() => {
        service.validateTravelSpeed(10000, 20, 200); // 10km in 20min = 30km/h
      }).not.toThrow();
    });

    it('should flag impossible travel speed', () => {
      expect(() => {
        service.validateTravelSpeed(100000, 10, 200); // 100km in 10min = 600km/h
      }).toThrow(FraudDetectionException);
    });

    it('should use custom thresholds', () => {
      // Should pass with high threshold
      expect(() => {
        service.validateTravelSpeed(100000, 10, 1000); // 600km/h with 1000km/h threshold
      }).not.toThrow();

      // Should fail with low threshold
      expect(() => {
        service.validateTravelSpeed(10000, 10, 50); // 60km/h with 50km/h threshold
      }).toThrow(FraudDetectionException);
    });

    it('should handle zero distance', () => {
      expect(() => {
        service.validateTravelSpeed(0, 10, 200); // No movement
      }).not.toThrow();
    });

    it('should handle invalid time values', () => {
      expect(() => {
        service.validateTravelSpeed(1000, 0, 200); // Zero time
      }).toThrow();

      expect(() => {
        service.validateTravelSpeed(1000, -5, 200); // Negative time
      }).toThrow();
    });
  });

  describe('validateLocationRadius', () => {
    it('should allow location within radius', () => {
      expect(() => {
        service.validateLocationRadius(50, 100, 'Test Office');
      }).not.toThrow();
    });

    it('should allow location exactly at radius boundary', () => {
      expect(() => {
        service.validateLocationRadius(100, 100, 'Test Office');
      }).not.toThrow();
    });

    it('should reject location outside radius in strict mode', () => {
      expect(() => {
        service.validateLocationRadius(150, 100, 'Test Office', true);
      }).toThrow(AttendanceValidationException);
    });

    it('should allow location outside radius in non-strict mode', () => {
      expect(() => {
        service.validateLocationRadius(150, 100, 'Test Office', false);
      }).not.toThrow();
    });

    it('should provide detailed error information', () => {
      try {
        service.validateLocationRadius(150.5, 100, 'Test Office');
      } catch (error) {
        expect(error).toBeInstanceOf(AttendanceValidationException);
        expect(error.getResponse().details.value).toBe(150.5);
        expect(error.getResponse().details.expectedValue).toBe(100);
        expect(error.getResponse().message).toContain('150.50m away from Test Office');
      }
    });
  });

  describe('validateSessionType', () => {
    it('should allow valid session types', () => {
      const validTypes = ['work', 'break', 'lunch', 'meeting', 'errand'];
      
      validTypes.forEach(type => {
        expect(() => {
          service.validateSessionType(type);
        }).not.toThrow();
      });
    });

    it('should reject invalid session types', () => {
      const invalidTypes = ['invalid', 'vacation', 'sick', ''];
      
      invalidTypes.forEach(type => {
        expect(() => {
          service.validateSessionType(type);
        }).toThrow(AttendanceValidationException);
      });
    });

    it('should be case sensitive', () => {
      expect(() => {
        service.validateSessionType('WORK');
      }).toThrow(AttendanceValidationException);

      expect(() => {
        service.validateSessionType('Break');
      }).toThrow(AttendanceValidationException);
    });
  });

  describe('validateTimeConstraints', () => {
    it('should allow operations with sufficient time gap', () => {
      const lastTime = new Date(Date.now() - 120000); // 2 minutes ago
      const currentTime = new Date();

      expect(() => {
        service.validateTimeConstraints('clock-in', currentTime, lastTime, 1);
      }).not.toThrow();
    });

    it('should prevent operations too close together', () => {
      const lastTime = new Date(Date.now() - 30000); // 30 seconds ago
      const currentTime = new Date();

      expect(() => {
        service.validateTimeConstraints('clock-in', currentTime, lastTime, 1);
      }).toThrow(AttendanceValidationException);
    });

    it('should allow first operation (no previous time)', () => {
      const currentTime = new Date();

      expect(() => {
        service.validateTimeConstraints('clock-in', currentTime, undefined, 1);
      }).not.toThrow();
    });

    it('should use custom minimum intervals', () => {
      const lastTime = new Date(Date.now() - 180000); // 3 minutes ago
      const currentTime = new Date();

      // Should pass with 2-minute minimum
      expect(() => {
        service.validateTimeConstraints('session-check-in', currentTime, lastTime, 2);
      }).not.toThrow();

      // Should fail with 5-minute minimum
      expect(() => {
        service.validateTimeConstraints('session-check-in', currentTime, lastTime, 5);
      }).toThrow(AttendanceValidationException);
    });
  });

  describe('validateBusinessHours', () => {
    it('should allow operations during business hours', () => {
      const businessTime = new Date('2024-01-15T10:00:00Z'); // 10 AM

      expect(() => {
        service.validateBusinessHours('clock-in', businessTime, 6, 22);
      }).not.toThrow();
    });

    it('should prevent operations outside business hours', () => {
      const earlyTime = new Date('2024-01-15T05:00:00Z'); // 5 AM
      const lateTime = new Date('2024-01-15T23:00:00Z'); // 11 PM

      expect(() => {
        service.validateBusinessHours('clock-in', earlyTime, 6, 22);
      }).toThrow(AttendanceValidationException);

      expect(() => {
        service.validateBusinessHours('clock-in', lateTime, 6, 22);
      }).toThrow(AttendanceValidationException);
    });

    it('should allow operations at business hour boundaries', () => {
      const startTime = new Date('2024-01-15T06:00:00Z'); // 6 AM
      const endTime = new Date('2024-01-15T22:00:00Z'); // 10 PM

      expect(() => {
        service.validateBusinessHours('clock-in', startTime, 6, 22);
      }).not.toThrow();

      expect(() => {
        service.validateBusinessHours('clock-out', endTime, 6, 22);
      }).not.toThrow();
    });

    it('should use custom business hours', () => {
      const time = new Date('2024-01-15T08:00:00Z'); // 8 AM

      // Should pass with 7-19 hours
      expect(() => {
        service.validateBusinessHours('clock-in', time, 7, 19);
      }).not.toThrow();

      // Should fail with 9-17 hours
      expect(() => {
        service.validateBusinessHours('clock-in', time, 9, 17);
      }).toThrow(AttendanceValidationException);
    });
  });

  describe('validateWorkHours', () => {
    it('should allow normal work hours', () => {
      expect(() => {
        service.validateWorkHours(8, 16);
      }).not.toThrow();
    });

    it('should allow maximum work hours', () => {
      expect(() => {
        service.validateWorkHours(16, 16);
      }).not.toThrow();
    });

    it('should prevent excessive work hours', () => {
      expect(() => {
        service.validateWorkHours(18, 16);
      }).toThrow(AttendanceValidationException);
    });

    it('should prevent negative work hours', () => {
      expect(() => {
        service.validateWorkHours(-2, 16);
      }).toThrow(AttendanceValidationException);
    });

    it('should use custom maximum hours', () => {
      // Should pass with 20-hour limit
      expect(() => {
        service.validateWorkHours(18, 20);
      }).not.toThrow();

      // Should fail with 12-hour limit
      expect(() => {
        service.validateWorkHours(14, 12);
      }).toThrow(AttendanceValidationException);
    });
  });

  describe('validateEntityAccess', () => {
    it('should allow access to authorized entities', () => {
      const authorizedEntities = ['entity-1', 'entity-2', 'entity-3'];

      expect(() => {
        service.validateEntityAccess('user-1', 'entity-2', authorizedEntities, 'clock-in');
      }).not.toThrow();
    });

    it('should deny access to unauthorized entities', () => {
      const authorizedEntities = ['entity-1', 'entity-2'];

      expect(() => {
        service.validateEntityAccess('user-1', 'entity-3', authorizedEntities, 'clock-in');
      }).toThrow(AttendanceValidationException);
    });

    it('should handle empty authorized entities list', () => {
      expect(() => {
        service.validateEntityAccess('user-1', 'entity-1', [], 'clock-in');
      }).toThrow(AttendanceValidationException);
    });
  });

  describe('validateConcurrentOperations', () => {
    it('should allow non-conflicting operations', () => {
      const activeOperations = ['session-check-in'];

      expect(() => {
        service.validateConcurrentOperations('user-1', 'location-check-in', activeOperations);
      }).not.toThrow();
    });

    it('should prevent conflicting operations', () => {
      const activeOperations = ['clock-in'];

      expect(() => {
        service.validateConcurrentOperations('user-1', 'clock-in', activeOperations);
      }).toThrow(AttendanceValidationException);
    });

    it('should handle multiple active operations', () => {
      const activeOperations = ['session-check-in', 'location-check-in'];

      expect(() => {
        service.validateConcurrentOperations('user-1', 'session-check-out', activeOperations);
      }).toThrow(AttendanceValidationException);
    });

    it('should allow operations when no active operations', () => {
      expect(() => {
        service.validateConcurrentOperations('user-1', 'clock-in', []);
      }).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined values gracefully', () => {
      expect(() => {
        service.validateClockInState(undefined, 'user-1');
      }).not.toThrow();

      expect(() => {
        service.validateSessionCheckInState(null, null, 'user-1');
      }).toThrow(AttendanceStateException);
    });

    it('should provide meaningful error messages', () => {
      try {
        service.validateLocationRadius(200, 100, 'Test Office');
      } catch (error) {
        expect(error.getResponse().message).toContain('location is 200.00m away from Test Office');
        expect(error.getResponse().details.suggestions).toContain('Move closer to your designated work location');
      }
    });

    it('should handle extreme coordinate values', () => {
      expect(() => {
        service.validateCoordinatePrecision(90, 180);
      }).not.toThrow();

      expect(() => {
        service.validateCoordinatePrecision(-90, -180);
      }).not.toThrow();
    });

    it('should validate input types', () => {
      expect(() => {
        service.validateWorkHours('invalid' as any, 16);
      }).toThrow();

      expect(() => {
        service.validateTravelSpeed('invalid' as any, 10, 200);
      }).toThrow();
    });
  })
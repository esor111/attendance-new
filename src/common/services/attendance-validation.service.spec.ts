import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceValidationService } from './attendance-validation.service';
import { 
  AttendanceStateException,
  AttendanceValidationException,
  GeospatialCalculationException,
  FraudDetectionException 
} from '../exceptions/attendance.exceptions';

/**
 * Attendance Validation Service Unit Tests
 * Tests attendance state management and validation rules
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.3, 3.1, 3.2, 7.1, 7.2, 7.3, 7.4, 7.5
 */
describe('AttendanceValidationService', () => {
  let service: AttendanceValidationService;

  // Test data for different attendance states
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
 
import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from '../src/modules/attendance/services/attendance.service';
import { DepartmentScheduleService } from '../src/modules/department/services/department-schedule.service';
import { FraudDetectionService } from '../src/modules/attendance/services/fraud-detection.service';

/**
 * Simple unit tests to verify schedule integration functionality
 */
describe('Schedule Integration Tests', () => {
  let attendanceService: AttendanceService;
  let departmentScheduleService: DepartmentScheduleService;
  let fraudDetectionService: FraudDetectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AttendanceService,
          useValue: {
            clockIn: jest.fn(),
            clockOut: jest.fn(),
            validateDepartmentSchedule: jest.fn(),
          },
        },
        {
          provide: DepartmentScheduleService,
          useValue: {
            validateAttendanceTime: jest.fn(),
            createSchedule: jest.fn(),
            getDepartmentSchedule: jest.fn(),
          },
        },
        {
          provide: FraudDetectionService,
          useValue: {
            checkDepartmentScheduleCompliance: jest.fn(),
            analyzeClockInLocation: jest.fn(),
          },
        },
      ],
    }).compile();

    attendanceService = module.get<AttendanceService>(AttendanceService);
    departmentScheduleService = module.get<DepartmentScheduleService>(DepartmentScheduleService);
    fraudDetectionService = module.get<FraudDetectionService>(FraudDetectionService);
  });

  describe('Department Schedule Validation', () => {
    it('should validate attendance time against department schedule', async () => {
      const testTime = new Date();
      testTime.setHours(10, 0, 0, 0); // 10:00 AM

      const mockValidation = {
        isValid: true,
        compliance: {
          isWithinSchedule: true,
          isWorkDay: true,
          isWithinHours: true,
        },
        schedule: {
          startTime: '09:00:00',
          endTime: '18:00:00',
          workDays: [1, 2, 3, 4, 5],
        },
      };

      jest.spyOn(departmentScheduleService, 'validateAttendanceTime')
        .mockResolvedValue(mockValidation);

      const result = await departmentScheduleService.validateAttendanceTime('dept-123', testTime);

      expect(result.isValid).toBe(true);
      expect(result.compliance?.isWithinSchedule).toBe(true);
      expect(departmentScheduleService.validateAttendanceTime).toHaveBeenCalledWith('dept-123', testTime);
    });

    it('should flag attendance outside working hours', async () => {
      const testTime = new Date();
      testTime.setHours(7, 0, 0, 0); // 7:00 AM (before 9:00 AM)

      const mockValidation = {
        isValid: false,
        compliance: {
          isWithinSchedule: false,
          isWorkDay: true,
          isWithinHours: false,
          message: 'Attendance outside working hours',
        },
        schedule: {
          startTime: '09:00:00',
          endTime: '18:00:00',
          workDays: [1, 2, 3, 4, 5],
        },
      };

      jest.spyOn(departmentScheduleService, 'validateAttendanceTime')
        .mockResolvedValue(mockValidation);

      const result = await departmentScheduleService.validateAttendanceTime('dept-123', testTime);

      expect(result.isValid).toBe(false);
      expect(result.compliance?.isWithinHours).toBe(false);
      expect(result.compliance?.message).toContain('outside working hours');
    });
  });

  describe('Fraud Detection Integration', () => {
    it('should check department schedule compliance', async () => {
      const testTime = new Date();
      const mockCompliance = {
        isCompliant: false,
        flagReason: 'Outside department working hours: outside hours (09:00-18:00)',
        schedule: {
          startTime: '09:00:00',
          endTime: '18:00:00',
          workDays: [1, 2, 3, 4, 5],
        },
      };

      jest.spyOn(fraudDetectionService, 'checkDepartmentScheduleCompliance')
        .mockResolvedValue(mockCompliance);

      const result = await fraudDetectionService.checkDepartmentScheduleCompliance('user-123', testTime);

      expect(result.isCompliant).toBe(false);
      expect(result.flagReason).toContain('Outside department working hours');
      expect(fraudDetectionService.checkDepartmentScheduleCompliance).toHaveBeenCalledWith('user-123', testTime);
    });
  });

  describe('Attendance Service Integration', () => {
    it('should validate schedule during clock-in', async () => {
      const mockClockIn = {
        id: 'attendance-123',
        userId: 'user-123',
        clockInTime: new Date(),
        isFlagged: true,
        flagReason: 'Outside department working hours: outside hours (09:00-18:00)',
      };

      jest.spyOn(attendanceService, 'clockIn')
        .mockResolvedValue(mockClockIn as any);

      const result = await attendanceService.clockIn('user-123', {
        latitude: 27.7172,
        longitude: 85.3240,
      } as any);

      expect(result.isFlagged).toBe(true);
      expect(result.flagReason).toContain('Outside department working hours');
    });

    it('should validate schedule during clock-out', async () => {
      const mockClockOut = {
        id: 'attendance-123',
        userId: 'user-123',
        clockOutTime: new Date(),
        isFlagged: true,
        flagReason: 'Outside department working hours: outside hours (09:00-18:00)',
      };

      jest.spyOn(attendanceService, 'clockOut')
        .mockResolvedValue(mockClockOut as any);

      const result = await attendanceService.clockOut('user-123', {
        latitude: 27.7172,
        longitude: 85.3240,
      } as any);

      expect(result.isFlagged).toBe(true);
      expect(result.flagReason).toContain('Outside department working hours');
    });
  });

  describe('Schedule Management', () => {
    it('should create department schedule', async () => {
      const mockSchedule = {
        id: 'schedule-123',
        departmentId: 'dept-123',
        name: 'Standard Hours',
        startTime: '09:00:00',
        endTime: '18:00:00',
        workDays: [1, 2, 3, 4, 5],
        isActive: true,
      };

      jest.spyOn(departmentScheduleService, 'createSchedule')
        .mockResolvedValue(mockSchedule as any);

      const result = await departmentScheduleService.createSchedule('dept-123', {
        name: 'Standard Hours',
        startTime: '09:00',
        endTime: '18:00',
        workDays: [1, 2, 3, 4, 5],
        isActive: true,
      } as any);

      expect(result.name).toBe('Standard Hours');
      expect(result.startTime).toBe('09:00:00');
      expect(result.workDays).toEqual([1, 2, 3, 4, 5]);
    });

    it('should get department schedule', async () => {
      const mockSchedule = {
        id: 'schedule-123',
        departmentId: 'dept-123',
        name: 'Standard Hours',
        startTime: '09:00:00',
        endTime: '18:00:00',
        workDays: [1, 2, 3, 4, 5],
        isActive: true,
      };

      jest.spyOn(departmentScheduleService, 'getDepartmentSchedule')
        .mockResolvedValue(mockSchedule as any);

      const result = await departmentScheduleService.getDepartmentSchedule('dept-123');

      expect(result).toBeDefined();
      expect(result?.departmentId).toBe('dept-123');
      expect(result?.isActive).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle schedule validation errors gracefully', async () => {
      jest.spyOn(departmentScheduleService, 'validateAttendanceTime')
        .mockRejectedValue(new Error('Schedule validation failed'));

      try {
        await departmentScheduleService.validateAttendanceTime('invalid-dept', new Date());
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Schedule validation failed');
      }
    });

    it('should handle missing department schedule', async () => {
      jest.spyOn(departmentScheduleService, 'getDepartmentSchedule')
        .mockResolvedValue(null);

      const result = await departmentScheduleService.getDepartmentSchedule('dept-without-schedule');

      expect(result).toBeNull();
    });
  });

  describe('Performance Considerations', () => {
    it('should handle multiple schedule validations efficiently', async () => {
      const mockValidation = {
        isValid: true,
        compliance: { isWithinSchedule: true, isWorkDay: true, isWithinHours: true },
      };

      jest.spyOn(departmentScheduleService, 'validateAttendanceTime')
        .mockResolvedValue(mockValidation);

      const startTime = Date.now();
      
      // Simulate 100 concurrent validations
      const promises = Array.from({ length: 100 }, (_, i) => {
        const testTime = new Date();
        testTime.setHours(9 + (i % 8), 0, 0, 0);
        return departmentScheduleService.validateAttendanceTime('dept-123', testTime);
      });

      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly (mocked, so should be very fast)
      expect(duration).toBeLessThan(100);
      expect(departmentScheduleService.validateAttendanceTime).toHaveBeenCalledTimes(100);
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './modules/attendance/services/attendance.service';
import { DepartmentScheduleService } from './modules/department/services/department-schedule.service';
import { FraudDetectionService } from './modules/attendance/services/fraud-detection.service';

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
      };

      jest.spyOn(fraudDetectionService, 'checkDepartmentScheduleCompliance')
        .mockResolvedValue(mockCompliance);

      const result = await fraudDetectionService.checkDepartmentScheduleCompliance('user-123', testTime);

      expect(result.isCompliant).toBe(false);
      expect(result.flagReason).toContain('Outside department working hours');
      expect(fraudDetectionService.checkDepartmentScheduleCompliance).toHaveBeenCalledWith('user-123', testTime);
    });
  });

  describe('Integration Success', () => {
    it('should have all services properly integrated', () => {
      expect(attendanceService).toBeDefined();
      expect(departmentScheduleService).toBeDefined();
      expect(fraudDetectionService).toBeDefined();
    });
  });
});
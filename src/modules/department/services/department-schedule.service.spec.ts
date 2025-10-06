import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DepartmentScheduleService } from './department-schedule.service';
import { DepartmentScheduleRepository } from '../repositories/department-schedule.repository';
import { DepartmentRepository } from '../repositories/department.repository';
import { DepartmentSchedule } from '../entities/department-schedule.entity';
import { Department } from '../entities/department.entity';

describe('DepartmentScheduleService', () => {
  let service: DepartmentScheduleService;
  let scheduleRepository: jest.Mocked<DepartmentScheduleRepository>;
  let departmentRepository: jest.Mocked<DepartmentRepository>;

  const mockDepartmentId = 'dept-123';
  const mockScheduleId = 'schedule-456';

  beforeEach(async () => {
    const mockScheduleRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByDepartmentId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deactivateAllForDepartment: jest.fn(),
      getScheduleCompliance: jest.fn(),
    };

    const mockDepartmentRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentScheduleService,
        {
          provide: DepartmentScheduleRepository,
          useValue: mockScheduleRepository,
        },
        {
          provide: DepartmentRepository,
          useValue: mockDepartmentRepository,
        },
      ],
    }).compile();

    service = module.get<DepartmentScheduleService>(DepartmentScheduleService);
    scheduleRepository = module.get(DepartmentScheduleRepository);
    departmentRepository = module.get(DepartmentRepository);
  });

  describe('createSchedule', () => {
    const createScheduleDto = {
      name: 'Regular Hours',
      startTime: '09:00',
      endTime: '18:00',
      workDays: [1, 2, 3, 4, 5], // Mon-Fri
    };

    it('should create department schedule successfully', async () => {
      const mockDepartment = { id: mockDepartmentId, name: 'Tech Department' } as Department;
      const mockSchedule = {
        id: mockScheduleId,
        departmentId: mockDepartmentId,
        name: 'Regular Hours',
        startTime: '09:00:00',
        endTime: '18:00:00',
        workDays: [1, 2, 3, 4, 5],
        isActive: true,
      } as DepartmentSchedule;

      departmentRepository.findById.mockResolvedValue(mockDepartment);
      scheduleRepository.findByDepartmentId.mockResolvedValue(null);
      scheduleRepository.create.mockResolvedValue(mockSchedule);

      const result = await service.createSchedule(mockDepartmentId, createScheduleDto);

      expect(result).toEqual(mockSchedule);
      expect(scheduleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentId: mockDepartmentId,
          name: 'Regular Hours',
          startTime: '09:00:00',
          endTime: '18:00:00',
          workDays: [1, 2, 3, 4, 5],
          isActive: true,
        })
      );
    });

    it('should throw NotFoundException if department not found', async () => {
      departmentRepository.findById.mockResolvedValue(null);

      await expect(service.createSchedule(mockDepartmentId, createScheduleDto))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid time range', async () => {
      const mockDepartment = { id: mockDepartmentId } as Department;
      departmentRepository.findById.mockResolvedValue(mockDepartment);

      const invalidDto = {
        ...createScheduleDto,
        startTime: '18:00',
        endTime: '09:00', // End before start
      };

      await expect(service.createSchedule(mockDepartmentId, invalidDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should deactivate existing schedule when creating new active one', async () => {
      const mockDepartment = { id: mockDepartmentId } as Department;
      const existingSchedule = { id: 'existing-123', isActive: true } as DepartmentSchedule;
      const newSchedule = { id: mockScheduleId } as DepartmentSchedule;

      departmentRepository.findById.mockResolvedValue(mockDepartment);
      scheduleRepository.findByDepartmentId.mockResolvedValue(existingSchedule);
      scheduleRepository.create.mockResolvedValue(newSchedule);

      await service.createSchedule(mockDepartmentId, createScheduleDto);

      expect(scheduleRepository.deactivateAllForDepartment).toHaveBeenCalledWith(mockDepartmentId);
    });
  });

  describe('validateAttendanceTime', () => {
    it('should return valid for time within schedule', async () => {
      const mockSchedule = {
        id: mockScheduleId,
        startTime: '09:00:00',
        endTime: '18:00:00',
        workDays: [1, 2, 3, 4, 5], // Mon-Fri
      } as DepartmentSchedule;

      const testTime = new Date('2025-10-06T10:00:00'); // Monday 10 AM
      
      scheduleRepository.findByDepartmentId.mockResolvedValue(mockSchedule);
      scheduleRepository.getScheduleCompliance.mockReturnValue({
        isWithinSchedule: true,
        isWorkDay: true,
        isWithinHours: true,
      });

      const result = await service.validateAttendanceTime(mockDepartmentId, testTime);

      expect(result.isValid).toBe(true);
      expect(result.schedule).toEqual(mockSchedule);
    });

    it('should return invalid for time outside schedule', async () => {
      const mockSchedule = {
        id: mockScheduleId,
        startTime: '09:00:00',
        endTime: '18:00:00',
        workDays: [1, 2, 3, 4, 5], // Mon-Fri
      } as DepartmentSchedule;

      const testTime = new Date('2025-10-05T10:00:00'); // Sunday 10 AM
      
      scheduleRepository.findByDepartmentId.mockResolvedValue(mockSchedule);
      scheduleRepository.getScheduleCompliance.mockReturnValue({
        isWithinSchedule: false,
        isWorkDay: false,
        isWithinHours: true,
        message: 'Sunday is not a work day for this department',
      });

      const result = await service.validateAttendanceTime(mockDepartmentId, testTime);

      expect(result.isValid).toBe(false);
      expect(result.compliance?.message).toContain('Sunday is not a work day');
    });

    it('should return valid when no schedule exists', async () => {
      scheduleRepository.findByDepartmentId.mockResolvedValue(null);

      const testTime = new Date('2025-10-05T10:00:00');
      const result = await service.validateAttendanceTime(mockDepartmentId, testTime);

      expect(result.isValid).toBe(true);
      expect(result.schedule).toBeUndefined();
    });
  });

  describe('getScheduleDisplayInfo', () => {
    it('should format schedule display information correctly', () => {
      const mockSchedule = {
        startTime: '09:00:00',
        endTime: '18:00:00',
        workDays: [1, 2, 3, 4, 5], // Mon-Fri
        isActive: true,
      } as DepartmentSchedule;

      const result = service.getScheduleDisplayInfo(mockSchedule);

      expect(result).toEqual({
        workingHours: '09:00 - 18:00',
        workDaysText: 'Mon, Tue, Wed, Thu, Fri',
        isActive: true,
      });
    });

    it('should handle Sunday-Friday schedule', () => {
      const mockSchedule = {
        startTime: '10:00:00',
        endTime: '17:00:00',
        workDays: [0, 1, 2, 3, 4, 5], // Sun-Fri
        isActive: true,
      } as DepartmentSchedule;

      const result = service.getScheduleDisplayInfo(mockSchedule);

      expect(result.workDaysText).toBe('Sun, Mon, Tue, Wed, Thu, Fri');
      expect(result.workingHours).toBe('10:00 - 17:00');
    });
  });
});
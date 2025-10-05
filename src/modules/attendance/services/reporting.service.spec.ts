import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingStructureRepository } from '../repositories/reporting-structure.repository';
import { DailyAttendanceRepository } from '../repositories/daily-attendance.repository';
import { LocationLogRepository } from '../repositories/location-log.repository';
import { AttendanceSessionRepository } from '../repositories/attendance-session.repository';

describe('ReportingService', () => {
  let service: ReportingService;
  let reportingStructureRepository: jest.Mocked<ReportingStructureRepository>;
  let attendanceRepository: jest.Mocked<DailyAttendanceRepository>;
  let locationLogRepository: jest.Mocked<LocationLogRepository>;
  let sessionRepository: jest.Mocked<AttendanceSessionRepository>;

  beforeEach(async () => {
    const mockReportingStructureRepository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findCircularRelationships: jest.fn(),
      existsRelationship: jest.fn(),
      endRelationship: jest.fn(),
      findCurrentTeamByManagerId: jest.fn(),
      getTeamMemberIds: jest.fn(),
      getReportingChain: jest.fn(),
      getAllSubordinates: jest.fn(),
    };

    const mockAttendanceRepository = {
      findByUserIds: jest.fn(),
      getAttendanceStats: jest.fn(),
      findByUserIdAndDateRange: jest.fn(),
    };

    const mockLocationLogRepository = {
      findByUserIdAndDateRange: jest.fn(),
    };

    const mockSessionRepository = {
      findByAttendanceIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        {
          provide: ReportingStructureRepository,
          useValue: mockReportingStructureRepository,
        },
        {
          provide: DailyAttendanceRepository,
          useValue: mockAttendanceRepository,
        },
        {
          provide: LocationLogRepository,
          useValue: mockLocationLogRepository,
        },
        {
          provide: AttendanceSessionRepository,
          useValue: mockSessionRepository,
        },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
    reportingStructureRepository = module.get(ReportingStructureRepository);
    attendanceRepository = module.get(DailyAttendanceRepository);
    locationLogRepository = module.get(LocationLogRepository);
    sessionRepository = module.get(AttendanceSessionRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReportingStructure', () => {
    it('should prevent self-reporting', async () => {
      const dto = {
        employeeId: 'user-1',
        managerId: 'user-1',
        startDate: new Date(),
      };

      await expect(service.createReportingStructure(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should prevent circular reporting relationships', async () => {
      const dto = {
        employeeId: 'user-1',
        managerId: 'user-2',
        startDate: new Date(),
      };

      reportingStructureRepository.findCircularRelationships.mockResolvedValue(true);

      await expect(service.createReportingStructure(dto)).rejects.toThrow(
        'This reporting relationship would create a circular reporting structure',
      );
    });

    it('should create valid reporting structure', async () => {
      const dto = {
        employeeId: 'user-1',
        managerId: 'user-2',
        startDate: new Date(),
      };

      const mockReportingStructure = {
        id: 'reporting-1',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      reportingStructureRepository.findCircularRelationships.mockResolvedValue(false);
      reportingStructureRepository.existsRelationship.mockResolvedValue(false);
      reportingStructureRepository.create.mockResolvedValue(mockReportingStructure as any);

      const result = await service.createReportingStructure(dto);

      expect(result).toEqual(mockReportingStructure);
      expect(reportingStructureRepository.create).toHaveBeenCalledWith({
        employeeId: dto.employeeId,
        managerId: dto.managerId,
        startDate: dto.startDate,
        endDate: undefined,
      });
    });
  });

  describe('getTeamAttendanceSummary', () => {
    it('should return empty summary for manager with no team', async () => {
      const managerId = 'manager-1';
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      reportingStructureRepository.getTeamMemberIds.mockResolvedValue([]);

      const result = await service.getTeamAttendanceSummary(managerId, startDate, endDate);

      expect(result).toEqual({
        teamMembers: [],
        statistics: {
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          flaggedDays: 0,
        },
        teamMemberStats: [],
      });
    });

    it('should return team attendance summary with statistics', async () => {
      const managerId = 'manager-1';
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');
      const teamMemberIds = ['user-1', 'user-2'];

      const mockAttendanceRecords = [
        {
          id: 'attendance-1',
          userId: 'user-1',
          date: new Date('2025-10-05'),
          clockInTime: new Date(),
          status: 'Present',
          user: { name: 'John Doe' },
        },
      ];

      const mockStatistics = {
        totalDays: 30,
        presentDays: 25,
        absentDays: 5,
        lateDays: 2,
        flaggedDays: 1,
      };

      reportingStructureRepository.getTeamMemberIds.mockResolvedValue(teamMemberIds);
      attendanceRepository.findByUserIds.mockResolvedValue(mockAttendanceRecords as any);
      attendanceRepository.getAttendanceStats.mockResolvedValue(mockStatistics);
      attendanceRepository.findByUserIdAndDateRange.mockResolvedValue([]);

      const result = await service.getTeamAttendanceSummary(managerId, startDate, endDate);

      expect(result.teamMembers).toEqual(mockAttendanceRecords);
      expect(result.statistics).toEqual(mockStatistics);
      expect(result.teamMemberStats).toHaveLength(teamMemberIds.length);
    });
  });

  describe('validateManagerAccess', () => {
    it('should validate manager access to employee', async () => {
      const managerId = 'manager-1';
      const employeeId = 'user-1';

      reportingStructureRepository.existsRelationship.mockResolvedValue(true);

      const result = await service.validateManagerAccess(managerId, employeeId);

      expect(result).toBe(true);
      expect(reportingStructureRepository.existsRelationship).toHaveBeenCalledWith(
        employeeId,
        managerId,
      );
    });

    it('should return false for no access', async () => {
      const managerId = 'manager-1';
      const employeeId = 'user-1';

      reportingStructureRepository.existsRelationship.mockResolvedValue(false);

      const result = await service.validateManagerAccess(managerId, employeeId);

      expect(result).toBe(false);
    });
  });

  describe('getTeamMemberDetailedReport', () => {
    it('should throw BadRequestException for unauthorized access', async () => {
      const managerId = 'manager-1';
      const employeeId = 'user-1';
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      reportingStructureRepository.existsRelationship.mockResolvedValue(false);

      await expect(
        service.getTeamMemberDetailedReport(managerId, employeeId, startDate, endDate),
      ).rejects.toThrow('No access to this employee\'s attendance data');
    });

    it('should return detailed report for authorized access', async () => {
      const managerId = 'manager-1';
      const employeeId = 'user-1';
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      const mockAttendance = [
        {
          id: 'attendance-1',
          userId: employeeId,
          date: new Date('2025-10-05'),
          clockInTime: new Date(),
          totalHours: 8.5,
        },
      ];

      const mockLocationLogs = [];
      const mockSessions = [];

      reportingStructureRepository.existsRelationship.mockResolvedValue(true);
      attendanceRepository.findByUserIdAndDateRange.mockResolvedValue(mockAttendance as any);
      locationLogRepository.findByUserIdAndDateRange.mockResolvedValue(mockLocationLogs);
      sessionRepository.findByAttendanceIds.mockResolvedValue(mockSessions);

      const result = await service.getTeamMemberDetailedReport(
        managerId,
        employeeId,
        startDate,
        endDate,
      );

      expect(result.attendance).toEqual(mockAttendance);
      expect(result.locationLogs).toEqual(mockLocationLogs);
      expect(result.sessions).toEqual(mockSessions);
      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalDays).toBe(1);
      expect(result.statistics.presentDays).toBe(1);
    });
  });
});
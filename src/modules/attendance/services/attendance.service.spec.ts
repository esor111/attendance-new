import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { GeospatialService } from './geospatial.service';
import { FraudDetectionService } from './fraud-detection.service';
import { DailyAttendanceRepository } from '../repositories/daily-attendance.repository';
import { AttendanceSessionRepository } from '../repositories/attendance-session.repository';
import { LocationLogRepository } from '../repositories/location-log.repository';
import { ReportingStructureRepository } from '../repositories/reporting-structure.repository';
import { DailyAttendance } from '../entities/daily-attendance.entity';
import { AttendanceSession } from '../entities/attendance-session.entity';
import { LocationLog } from '../entities/location-log.entity';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let geospatialService: jest.Mocked<GeospatialService>;
  let fraudDetectionService: jest.Mocked<FraudDetectionService>;
  let attendanceRepository: jest.Mocked<DailyAttendanceRepository>;
  let sessionRepository: jest.Mocked<AttendanceSessionRepository>;
  let locationLogRepository: jest.Mocked<LocationLogRepository>;
  let reportingStructureRepository: jest.Mocked<ReportingStructureRepository>;

  const mockUserId = 'user-123';
  const mockEntityId = 'entity-456';
  const mockAttendanceId = 'attendance-789';
  const mockSessionId = 'session-101';
  const mockLocationLogId = 'log-202';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: GeospatialService,
          useValue: {
            validateLocationAccess: jest.fn(),
            hasEntityAccess: jest.fn(),
            getEntityById: jest.fn(),
            isWithinRadius: jest.fn(),
            calculateDistance: jest.fn(),
          },
        },
        {
          provide: FraudDetectionService,
          useValue: {
            analyzeClockInLocation: jest.fn(),
            analyzeClockOutTravel: jest.fn(),
            analyzeSessionTravel: jest.fn(),
            analyzeLocationLogTravel: jest.fn(),
            flagSuspiciousActivity: jest.fn(),
          },
        },
        {
          provide: DailyAttendanceRepository,
          useValue: {
            findTodayByUserId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findById: jest.fn(),
            findByUserIdAndDate: jest.fn(),
            findByUserIdAndDateRange: jest.fn(),
            findByUserIds: jest.fn(),
            getAttendanceStats: jest.fn(),
            findFlagged: jest.fn(),
          },
        },
        {
          provide: AttendanceSessionRepository,
          useValue: {
            findActiveByAttendanceId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findById: jest.fn(),
            findFlagged: jest.fn(),
          },
        },
        {
          provide: LocationLogRepository,
          useValue: {
            findActiveByAttendanceId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findById: jest.fn(),
            findLastCompletedLog: jest.fn(),
            findByUserIdAndDateRange: jest.fn(),
            findFlagged: jest.fn(),
          },
        },
        {
          provide: ReportingStructureRepository,
          useValue: {
            getTeamMemberIds: jest.fn(),
            existsRelationship: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    geospatialService = module.get(GeospatialService);
    fraudDetectionService = module.get(FraudDetectionService);
    attendanceRepository = module.get(DailyAttendanceRepository);
    sessionRepository = module.get(AttendanceSessionRepository);
    locationLogRepository = module.get(LocationLogRepository);
    reportingStructureRepository = module.get(ReportingStructureRepository);
  });

  describe('clockIn', () => {
    const clockInDto = {
      latitude: 27.7172,
      longitude: 85.3240,
      notes: 'Starting work',
    };

    it('should successfully clock in with valid location', async () => {
      const mockLocationValidation = {
        isValid: true,
        entity: {
          entityId: mockEntityId,
          entityName: 'Test Entity',
          distance: 50,
          isWithinRadius: true,
          latitude: 27.7172,
          longitude: 85.3240,
          radiusMeters: 100,
        },
      };

      const mockFraudAnalysis = {
        isSuspicious: false,
        riskLevel: 'low' as const,
      };

      const mockAttendance = {
        id: mockAttendanceId,
        userId: mockUserId,
        date: new Date(),
        clockInTime: new Date(),
        clockInLatitude: clockInDto.latitude,
        clockInLongitude: clockInDto.longitude,
        entityId: mockEntityId,
        isWithinRadius: true,
        isFlagged: false,
        status: 'Present',
        notes: clockInDto.notes,
      } as DailyAttendance;

      attendanceRepository.findTodayByUserId.mockResolvedValue(null);
      geospatialService.validateLocationAccess.mockResolvedValue(mockLocationValidation);
      fraudDetectionService.analyzeClockInLocation.mockResolvedValue(mockFraudAnalysis);
      attendanceRepository.create.mockResolvedValue(mockAttendance);

      const result = await service.clockIn(mockUserId, clockInDto);

      expect(result).toEqual(mockAttendance);
      expect(attendanceRepository.findTodayByUserId).toHaveBeenCalledWith(mockUserId);
      expect(geospatialService.validateLocationAccess).toHaveBeenCalledWith(
        mockUserId,
        clockInDto.latitude,
        clockInDto.longitude,
      );
      expect(fraudDetectionService.analyzeClockInLocation).toHaveBeenCalledWith(
        mockUserId,
        clockInDto.latitude,
        clockInDto.longitude,
      );
      expect(attendanceRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if already clocked in', async () => {
      const existingAttendance = {
        id: mockAttendanceId,
        clockInTime: new Date(),
      } as DailyAttendance;

      attendanceRepository.findTodayByUserId.mockResolvedValue(existingAttendance);

      await expect(service.clockIn(mockUserId, clockInDto)).rejects.toThrow(ConflictException);
      expect(attendanceRepository.findTodayByUserId).toHaveBeenCalledWith(mockUserId);
    });

    it('should throw BadRequestException for invalid location', async () => {
      const mockLocationValidation = {
        isValid: false,
        errorMessage: 'Location is outside authorized area',
      };

      attendanceRepository.findTodayByUserId.mockResolvedValue(null);
      geospatialService.validateLocationAccess.mockResolvedValue(mockLocationValidation);

      await expect(service.clockIn(mockUserId, clockInDto)).rejects.toThrow(BadRequestException);
    });

    it('should flag suspicious activity during clock-in', async () => {
      const mockLocationValidation = {
        isValid: true,
        entity: {
          entityId: mockEntityId,
          entityName: 'Test Entity',
          distance: 50,
          isWithinRadius: true,
          latitude: 27.7172,
          longitude: 85.3240,
          radiusMeters: 100,
        },
      };

      const mockFraudAnalysis = {
        isSuspicious: true,
        flagReason: 'Impossible travel speed detected',
        riskLevel: 'high' as const,
      };

      const mockAttendance = {
        id: mockAttendanceId,
        userId: mockUserId,
        isFlagged: true,
        flagReason: 'Impossible travel speed detected',
      } as DailyAttendance;

      attendanceRepository.findTodayByUserId.mockResolvedValue(null);
      geospatialService.validateLocationAccess.mockResolvedValue(mockLocationValidation);
      fraudDetectionService.analyzeClockInLocation.mockResolvedValue(mockFraudAnalysis);
      attendanceRepository.create.mockResolvedValue(mockAttendance);

      const result = await service.clockIn(mockUserId, clockInDto);

      expect(result.isFlagged).toBe(true);
      expect(fraudDetectionService.flagSuspiciousActivity).toHaveBeenCalledWith(
        mockAttendanceId,
        'attendance',
        'Impossible travel speed detected',
      );
    });
  });

  describe('clockOut', () => {
    const clockOutDto = {
      latitude: 27.7175,
      longitude: 85.3245,
      notes: 'End of work',
    };

    it('should successfully clock out', async () => {
      const mockAttendance = {
        id: mockAttendanceId,
        userId: mockUserId,
        clockInTime: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        clockInLatitude: 27.7172,
        clockInLongitude: 85.3240,
        clockOutTime: null,
      } as DailyAttendance;

      const mockFraudAnalysis = {
        isSuspicious: false,
        travelSpeedKmph: 2.5,
        riskLevel: 'low' as const,
      };

      const mockUpdatedAttendance = {
        ...mockAttendance,
        clockOutTime: new Date(),
        clockOutLatitude: clockOutDto.latitude,
        clockOutLongitude: clockOutDto.longitude,
        totalHours: 8,
        travelSpeedKmph: 2.5,
      } as DailyAttendance;

      attendanceRepository.findTodayByUserId.mockResolvedValue(mockAttendance);
      sessionRepository.findActiveByAttendanceId.mockResolvedValue(null);
      fraudDetectionService.analyzeClockOutTravel.mockResolvedValue(mockFraudAnalysis);
      attendanceRepository.update.mockResolvedValue(mockUpdatedAttendance);

      const result = await service.clockOut(mockUserId, clockOutDto);

      expect(result).toEqual(mockUpdatedAttendance);
      expect(attendanceRepository.findTodayByUserId).toHaveBeenCalledWith(mockUserId);
      expect(sessionRepository.findActiveByAttendanceId).toHaveBeenCalledWith(mockAttendanceId);
      expect(fraudDetectionService.analyzeClockOutTravel).toHaveBeenCalledWith(
        mockAttendanceId,
        clockOutDto.latitude,
        clockOutDto.longitude,
      );
    });

    it('should throw NotFoundException if no attendance record found', async () => {
      attendanceRepository.findTodayByUserId.mockResolvedValue(null);

      await expect(service.clockOut(mockUserId, clockOutDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not clocked in', async () => {
      const mockAttendance = {
        id: mockAttendanceId,
        clockInTime: null,
      } as DailyAttendance;

      attendanceRepository.findTodayByUserId.mockResolvedValue(mockAttendance);

      await expect(service.clockOut(mockUserId, clockOutDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if already clocked out', async () => {
      const mockAttendance = {
        id: mockAttendanceId,
        clockInTime: new Date(),
        clockOutTime: new Date(),
      } as DailyAttendance;

      attendanceRepository.findTodayByUserId.mockResolvedValue(mockAttendance);

      await expect(service.clockOut(mockUserId, clockOutDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if active session exists', async () => {
      const mockAttendance = {
        id: mockAttendanceId,
        clockInTime: new Date(),
        clockOutTime: null,
      } as DailyAttendance;

      const mockActiveSession = {
        id: mockSessionId,
        checkOutTime: null,
      } as AttendanceSession;

      attendanceRepository.findTodayByUserId.mockResolvedValue(mockAttendance);
      sessionRepository.findActiveByAttendanceId.mockResolvedValue(mockActiveSession);

      await expect(service.clockOut(mockUserId, clockOutDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('sessionCheckIn', () => {
    const sessionCheckInDto = {
      latitude: 27.7172,
      longitude: 85.3240,
      sessionType: 'break',
      notes: 'Coffee break',
    };

    it('should successfully start a session', async () => {
      const mockAttendance = {
        id: mockAttendanceId,
        clockInTime: new Date(),
      } as DailyAttendance;

      const mockLocationValidation = {
        isValid: true,
        entity: {
          entityId: mockEntityId,
          isWithinRadius: true,
        },
      };

      const mockSession = {
        id: mockSessionId,
        attendanceId: mockAttendanceId,
        checkInTime: new Date(),
        sessionType: 'break',
        notes: 'Coffee break',
      } as AttendanceSession;

      attendanceRepository.findTodayByUserId.mockResolvedValue(mockAttendance);
      sessionRepository.findActiveByAttendanceId.mockResolvedValue(null);
      geospatialService.validateLocationAccess.mockResolvedValue(mockLocationValidation);
      sessionRepository.create.mockResolvedValue(mockSession);

      const result = await service.sessionCheckIn(mockUserId, sessionCheckInDto);

      expect(result).toEqual(mockSession);
      expect(attendanceRepository.findTodayByUserId).toHaveBeenCalledWith(mockUserId);
      expect(sessionRepository.findActiveByAttendanceId).toHaveBeenCalledWith(mockAttendanceId);
      expect(geospatialService.validateLocationAccess).toHaveBeenCalledWith(
        mockUserId,
        sessionCheckInDto.latitude,
        sessionCheckInDto.longitude,
      );
    });

    it('should throw BadRequestException if no daily attendance', async () => {
      attendanceRepository.findTodayByUserId.mockResolvedValue(null);

      await expect(service.sessionCheckIn(mockUserId, sessionCheckInDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if active session exists', async () => {
      const mockAttendance = {
        id: mockAttendanceId,
        clockInTime: new Date(),
      } as DailyAttendance;

      const mockActiveSession = {
        id: mockSessionId,
        checkOutTime: null,
      } as AttendanceSession;

      attendanceRepository.findTodayByUserId.mockResolvedValue(mockAttendance);
      sessionRepository.findActiveByAttendanceId.mockResolvedValue(mockActiveSession);

      await expect(service.sessionCheckIn(mockUserId, sessionCheckInDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('sessionCheckOut', () => {
    const sessionCheckOutDto = {
      latitude: 27.7175,
      longitude: 85.3245,
      notes: 'Back from break',
    };

    it('should successfully end a session', async () => {
      const mockAttendance = {
        id: mockAttendanceId,
      } as DailyAttendance;

      const mockActiveSession = {
        id: mockSessionId,
        checkInTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        checkInLatitude: 27.7172,
        checkInLongitude: 85.3240,
        notes: 'Coffee break',
      } as AttendanceSession;

      const mockFraudAnalysis = {
        isSuspicious: false,
        travelSpeedKmph: 1.2,
        riskLevel: 'low' as const,
      };

      const mockUpdatedSession = {
        ...mockActiveSession,
        checkOutTime: new Date(),
        sessionDurationMinutes: 30,
        travelSpeedKmph: 1.2,
      } as AttendanceSession;

      attendanceRepository.findTodayByUserId.mockResolvedValue(mockAttendance);
      sessionRepository.findActiveByAttendanceId.mockResolvedValue(mockActiveSession);
      fraudDetectionService.analyzeSessionTravel.mockResolvedValue(mockFraudAnalysis);
      sessionRepository.update.mockResolvedValue(mockUpdatedSession);

      const result = await service.sessionCheckOut(mockUserId, sessionCheckOutDto);

      expect(result).toEqual(mockUpdatedSession);
      expect(fraudDetectionService.analyzeSessionTravel).toHaveBeenCalledWith(
        mockSessionId,
        sessionCheckOutDto.latitude,
        sessionCheckOutDto.longitude,
      );
    });

    it('should throw BadRequestException if no active session', async () => {
      const mockAttendance = {
        id: mockAttendanceId,
      } as DailyAttendance;

      attendanceRepository.findTodayByUserId.mockResolvedValue(mockAttendance);
      sessionRepository.findActiveByAttendanceId.mockResolvedValue(null);

      await expect(service.sessionCheckOut(mockUserId, sessionCheckOutDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('locationCheckIn', () => {
    const locationCheckInDto = {
      entityId: mockEntityId,
      latitude: 27.7200,
      longitude: 85.3300,
      purpose: 'Client meeting',
      notes: 'Meeting with client',
    };

    it('should successfully check in to a location', async () => {
      const mockAttendance = {
        id: mockAttendanceId,
        clockInTime: new Date(),
      } as DailyAttendance;

      const mockEntity = {
        id: mockEntityId,
        name: 'Client Site A',
        location: { coordinates: [85.3300, 27.7200] },
        radiusMeters: 100,
      };

      const mockLocationLog = {
        id: mockLocationLogId,
        attendanceId: mockAttendanceId,
        entityId: mockEntityId,
        placeName: 'Client Site A',
        checkInTime: new Date(),
        isWithinRadius: true,
        purpose: 'Client meeting',
      } as LocationLog;

      attendanceRepository.findTodayByUserId.mockResolvedValue(mockAttendance);
      locationLogRepository.findActiveByAttendanceId.mockResolvedValue(null);
      geospatialService.hasEntityAccess.mockResolvedValue(true);
      geospatialService.getEntityById.mockResolvedValue(mockEntity);
      geospatialService.isWithinRadius.mockReturnValue(true);
      locationLogRepository.create.mockResolvedValue(mockLocationLog);

      const result = await service.locationCheckIn(mockUserId, locationCheckInDto);

      expect(result).toEqual(mockLocationLog);
      expect(geospatialService.hasEntityAccess).toHaveBeenCalledWith(mockUserId, mockEntityId);
      expect(geospatialService.getEntityById).toHaveBeenCalledWith(mockEntityId);
    });

    it('should throw BadRequestException if no daily attendance', async () => {
      attendanceRepository.findTodayByUserId.mockResolvedValue(null);

      await expect(service.locationCheckIn(mockUserId, locationCheckInDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if no entity access', async () => {
      const mockAttendance = {
        id: mockAttendanceId,
        clockInTime: new Date(),
      } as DailyAttendance;

      attendanceRepository.findTodayByUserId.mockResolvedValue(mockAttendance);
      locationLogRepository.findActiveByAttendanceId.mockResolvedValue(null);
      geospatialService.hasEntityAccess.mockResolvedValue(false);

      await expect(service.locationCheckIn(mockUserId, locationCheckInDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Query Methods', () => {
    it('should get today\'s attendance', async () => {
      const mockAttendance = {
        id: mockAttendanceId,
        userId: mockUserId,
        date: new Date(),
      } as DailyAttendance;

      attendanceRepository.findTodayByUserId.mockResolvedValue(mockAttendance);

      const result = await service.getTodayAttendance(mockUserId);

      expect(result).toEqual(mockAttendance);
      expect(attendanceRepository.findTodayByUserId).toHaveBeenCalledWith(mockUserId);
    });

    it('should get attendance by date', async () => {
      const testDate = new Date('2025-10-05');
      const mockAttendance = {
        id: mockAttendanceId,
        userId: mockUserId,
        date: testDate,
      } as DailyAttendance;

      attendanceRepository.findByUserIdAndDate.mockResolvedValue(mockAttendance);

      const result = await service.getAttendanceByDate(mockUserId, testDate);

      expect(result).toEqual(mockAttendance);
      expect(attendanceRepository.findByUserIdAndDate).toHaveBeenCalledWith(mockUserId, testDate);
    });

    it('should get current session', async () => {
      const mockAttendance = {
        id: mockAttendanceId,
      } as DailyAttendance;

      const mockSession = {
        id: mockSessionId,
        attendanceId: mockAttendanceId,
      } as AttendanceSession;

      attendanceRepository.findTodayByUserId.mockResolvedValue(mockAttendance);
      sessionRepository.findActiveByAttendanceId.mockResolvedValue(mockSession);

      const result = await service.getCurrentSession(mockUserId);

      expect(result).toEqual(mockSession);
    });

    it('should return null for current session if no attendance', async () => {
      attendanceRepository.findTodayByUserId.mockResolvedValue(null);

      const result = await service.getCurrentSession(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('Team Management', () => {
    const managerId = 'manager-123';
    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    it('should get team attendance', async () => {
      const teamMemberIds = ['user-1', 'user-2', 'user-3'];
      const mockAttendanceRecords = [
        { id: 'att-1', userId: 'user-1' },
        { id: 'att-2', userId: 'user-2' },
      ] as DailyAttendance[];

      const mockStats = {
        totalDays: 30,
        presentDays: 25,
        absentDays: 5,
        lateDays: 2,
        flaggedDays: 1,
      };

      reportingStructureRepository.getTeamMemberIds.mockResolvedValue(teamMemberIds);
      attendanceRepository.findByUserIds.mockResolvedValue(mockAttendanceRecords);
      attendanceRepository.getAttendanceStats.mockResolvedValue(mockStats);

      const result = await service.getTeamAttendance(managerId, startDate, endDate);

      expect(result).toEqual({
        teamMembers: mockAttendanceRecords,
        statistics: mockStats,
      });
      expect(reportingStructureRepository.getTeamMemberIds).toHaveBeenCalledWith(managerId);
      expect(attendanceRepository.findByUserIds).toHaveBeenCalledWith(teamMemberIds, startDate, endDate);
    });

    it('should return empty result for manager with no team', async () => {
      reportingStructureRepository.getTeamMemberIds.mockResolvedValue([]);

      const result = await service.getTeamAttendance(managerId, startDate, endDate);

      expect(result).toEqual({
        teamMembers: [],
        statistics: {
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          flaggedDays: 0,
        },
      });
    });

    it('should get individual team member attendance', async () => {
      const employeeId = 'employee-456';
      const mockAttendanceRecords = [
        { id: 'att-1', userId: employeeId },
      ] as DailyAttendance[];

      reportingStructureRepository.existsRelationship.mockResolvedValue(true);
      attendanceRepository.findByUserIdAndDateRange.mockResolvedValue(mockAttendanceRecords);

      const result = await service.getTeamMemberAttendance(managerId, employeeId, startDate, endDate);

      expect(result).toEqual(mockAttendanceRecords);
      expect(reportingStructureRepository.existsRelationship).toHaveBeenCalledWith(employeeId, managerId);
    });

    it('should throw BadRequestException for unauthorized team member access', async () => {
      const employeeId = 'employee-456';

      reportingStructureRepository.existsRelationship.mockResolvedValue(false);

      await expect(
        service.getTeamMemberAttendance(managerId, employeeId, startDate, endDate),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Flagged Records', () => {
    it('should get flagged records', async () => {
      const mockFlaggedAttendance = [{ id: 'att-1', isFlagged: true }] as DailyAttendance[];
      const mockFlaggedSessions = [{ id: 'sess-1', isFlagged: true }] as AttendanceSession[];
      const mockFlaggedLogs = [{ id: 'log-1', isFlagged: true }] as LocationLog[];

      attendanceRepository.findFlagged.mockResolvedValue(mockFlaggedAttendance);
      sessionRepository.findFlagged.mockResolvedValue(mockFlaggedSessions);
      locationLogRepository.findFlagged.mockResolvedValue(mockFlaggedLogs);

      const result = await service.getFlaggedRecords(50);

      expect(result).toEqual({
        attendance: mockFlaggedAttendance,
        sessions: mockFlaggedSessions,
        locationLogs: mockFlaggedLogs,
      });
    });
  });
});
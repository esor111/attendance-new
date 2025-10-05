import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { GeospatialService } from './geospatial.service';
import { FraudDetectionService } from './fraud-detection.service';
import { DailyAttendanceRepository } from '../repositories/daily-attendance.repository';
import { AttendanceSessionRepository } from '../repositories/attendance-session.repository';
import { LocationLogRepository } from '../repositories/location-log.repository';
import { ReportingStructureRepository } from '../repositories/reporting-structure.repository';
import { ClockInDto } from '../dto/clock-in.dto';
import { ClockOutDto } from '../dto/clock-out.dto';
import { SessionCheckInDto } from '../dto/session-check-in.dto';
import { SessionCheckOutDto } from '../dto/session-check-out.dto';

/**
 * Attendance Core Integration Tests
 * Tests the core attendance service functionality with mocked dependencies
 * Focuses on business logic validation and service integration
 */
describe('AttendanceService Core Integration', () => {
  let service: AttendanceService;
  let geospatialService: jest.Mocked<GeospatialService>;
  let fraudDetectionService: jest.Mocked<FraudDetectionService>;
  let attendanceRepository: jest.Mocked<DailyAttendanceRepository>;
  let sessionRepository: jest.Mocked<AttendanceSessionRepository>;

  const mockUserId = 'user-123';
  const mockEntityId = 'entity-456';
  const mockAttendanceId = 'attendance-789';

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
          },
        },
        {
          provide: AttendanceSessionRepository,
          useValue: {
            findActiveByAttendanceId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: LocationLogRepository,
          useValue: {
            findActiveByAttendanceId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
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
  });

  describe('Clock-In Functionality', () => {
    it('should successfully clock in with valid location', async () => {
      const clockInDto: ClockInDto = {
        latitude: 27.7172,
        longitude: 85.3240,
        notes: 'Starting work',
      };

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
      };

      // Setup mocks
      attendanceRepository.findTodayByUserId.mockResolvedValue(null);
      geospatialService.validateLocationAccess.mockResolvedValue(mockLocationValidation);
      fraudDetectionService.analyzeClockInLocation.mockResolvedValue(mockFraudAnalysis);
      attendanceRepository.create.mockResolvedValue(mockAttendance as any);

      // Execute
      const result = await service.clockIn(mockUserId, clockInDto);

      // Verify
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

    it('should reject duplicate clock-in attempts', async () => {
      const clockInDto: ClockInDto = {
        latitude: 27.7172,
        longitude: 85.3240,
      };

      const existingAttendance = {
        id: mockAttendanceId,
        clockInTime: new Date(),
      };

      attendanceRepository.findTodayByUserId.mockResolvedValue(existingAttendance as any);

      await expect(service.clockIn(mockUserId, clockInDto)).rejects.toThrow(
        'Already clocked in for today',
      );
    });
  });

  describe('Clock-Out Functionality', () => {
    it('should successfully clock out with valid conditions', async () => {
      const clockOutDto: ClockOutDto = {
        latitude: 27.7175,
        longitude: 85.3245,
        notes: 'End of work',
      };

      const mockAttendance = {
        id: mockAttendanceId,
        userId: mockUserId,
        clockInTime: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        clockInLatitude: 27.7172,
        clockInLongitude: 85.3240,
        clockOutTime: null,
      };

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
        totalHours: 8.0,
        travelSpeedKmph: 2.5,
      };

      // Setup mocks
      attendanceRepository.findTodayByUserId.mockResolvedValue(mockAttendance as any);
      sessionRepository.findActiveByAttendanceId.mockResolvedValue(null);
      fraudDetectionService.analyzeClockOutTravel.mockResolvedValue(mockFraudAnalysis);
      attendanceRepository.update.mockResolvedValue(mockUpdatedAttendance as any);

      // Execute
      const result = await service.clockOut(mockUserId, clockOutDto);

      // Verify
      expect(result).toEqual(mockUpdatedAttendance);
      expect(attendanceRepository.findTodayByUserId).toHaveBeenCalledWith(mockUserId);
      expect(sessionRepository.findActiveByAttendanceId).toHaveBeenCalledWith(mockAttendanceId);
      expect(fraudDetectionService.analyzeClockOutTravel).toHaveBeenCalledWith(
        mockAttendanceId,
        clockOutDto.latitude,
        clockOutDto.longitude,
      );
    });

    it('should reject clock-out without clock-in', async () => {
      const clockOutDto: ClockOutDto = {
        latitude: 27.7175,
        longitude: 85.3245,
      };

      attendanceRepository.findTodayByUserId.mockResolvedValue(null);

      await expect(service.clockOut(mockUserId, clockOutDto)).rejects.toThrow(
        'No attendance record found for today',
      );
    });
  });

  describe('Session Management', () => {
    it('should successfully start a session', async () => {
      const sessionCheckInDto: SessionCheckInDto = {
        latitude: 27.7172,
        longitude: 85.3240,
        sessionType: 'break',
        notes: 'Coffee break',
      };

      const mockAttendance = {
        id: mockAttendanceId,
        clockInTime: new Date(),
      };

      const mockLocationValidation = {
        isValid: true,
        entity: {
          entityId: mockEntityId,
          isWithinRadius: true,
        },
      };

      const mockSession = {
        id: 'session-123',
        attendanceId: mockAttendanceId,
        checkInTime: new Date(),
        checkInLatitude: sessionCheckInDto.latitude,
        checkInLongitude: sessionCheckInDto.longitude,
        sessionType: sessionCheckInDto.sessionType,
        isWithinRadius: true,
        notes: sessionCheckInDto.notes,
      };

      // Setup mocks
      attendanceRepository.findTodayByUserId.mockResolvedValue(mockAttendance as any);
      sessionRepository.findActiveByAttendanceId.mockResolvedValue(null);
      geospatialService.validateLocationAccess.mockResolvedValue(mockLocationValidation as any);
      sessionRepository.create.mockResolvedValue(mockSession as any);

      // Execute
      const result = await service.sessionCheckIn(mockUserId, sessionCheckInDto);

      // Verify
      expect(result).toEqual(mockSession);
      expect(attendanceRepository.findTodayByUserId).toHaveBeenCalledWith(mockUserId);
      expect(sessionRepository.findActiveByAttendanceId).toHaveBeenCalledWith(mockAttendanceId);
      expect(geospatialService.validateLocationAccess).toHaveBeenCalledWith(
        mockUserId,
        sessionCheckInDto.latitude,
        sessionCheckInDto.longitude,
      );
    });

    it('should reject session check-in without daily attendance', async () => {
      const sessionCheckInDto: SessionCheckInDto = {
        latitude: 27.7172,
        longitude: 85.3240,
        sessionType: 'break',
      };

      attendanceRepository.findTodayByUserId.mockResolvedValue(null);

      await expect(service.sessionCheckIn(mockUserId, sessionCheckInDto)).rejects.toThrow(
        'Must clock-in for daily attendance before starting a session',
      );
    });
  });

  describe('Query Methods', () => {
    it('should get today\'s attendance', async () => {
      const mockAttendance = {
        id: mockAttendanceId,
        userId: mockUserId,
        date: new Date(),
        clockInTime: new Date(),
        status: 'Present',
      };

      attendanceRepository.findTodayByUserId.mockResolvedValue(mockAttendance as any);

      const result = await service.getTodayAttendance(mockUserId);

      expect(result).toEqual(mockAttendance);
      expect(attendanceRepository.findTodayByUserId).toHaveBeenCalledWith(mockUserId);
    });

    it('should get current session', async () => {
      const mockAttendance = {
        id: mockAttendanceId,
      };

      const mockSession = {
        id: 'session-123',
        attendanceId: mockAttendanceId,
        checkInTime: new Date(),
        checkOutTime: null,
        sessionType: 'break',
      };

      attendanceRepository.findTodayByUserId.mockResolvedValue(mockAttendance as any);
      sessionRepository.findActiveByAttendanceId.mockResolvedValue(mockSession as any);

      const result = await service.getCurrentSession(mockUserId);

      expect(result).toEqual(mockSession);
      expect(attendanceRepository.findTodayByUserId).toHaveBeenCalledWith(mockUserId);
      expect(sessionRepository.findActiveByAttendanceId).toHaveBeenCalledWith(mockAttendanceId);
    });
  });
});
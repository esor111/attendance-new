import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { EntityAccessService } from './entity-access.service';
import { GeospatialService } from './geospatial.service';
import { FraudDetectionService } from './fraud-detection.service';
import { AttendanceValidationService } from '../../../common/services/attendance-validation.service';
import { DailyAttendanceRepository } from '../repositories/daily-attendance.repository';
import { AttendanceSessionRepository } from '../repositories/attendance-session.repository';
import { LocationLogRepository } from '../repositories/location-log.repository';

/**
 * Attendance Workflow Integration Tests
 * Tests complete clock-in/out workflows with location validation
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 4.1, 4.2, 7.1, 7.2
 */
describe('Attendance Workflow Integration', () => {
  let attendanceService: AttendanceService;
  let entityAccessService: EntityAccessService;
  let geospatialService: GeospatialService;
  let fraudDetectionService: FraudDetectionService;
  let validationService: AttendanceValidationService;
  let dailyAttendanceRepo: DailyAttendanceRepository;
  let sessionRepo: AttendanceSessionRepository;
  let locationRepo: LocationLogRepository;

  // Test entities and locations
  const testEntities = {
    mainOffice: {
      id: 'entity-main-office',
      name: 'Main Office',
      kahaId: 'MAIN-001',
      latitude: 27.7172,
      longitude: 85.3240,
      radiusMeters: 100,
      isActive: true,
    },
    branchOffice: {
      id: 'entity-branch-office',
      name: 'Branch Office',
      kahaId: 'BRANCH-001',
      latitude: 27.7272,
      longitude: 85.3340,
      radiusMeters: 150,
      isActive: true,
    },
    clientSite: {
      id: 'entity-client-site',
      name: 'Client Site A',
      kahaId: 'CLIENT-A-001',
      latitude: 27.6588,
      longitude: 85.3247,
      radiusMeters: 200,
      isActive: true,
    }
  };

  const testUsers = {
    officeWorker: {
      userId: 'user-office-worker',
      authorizedEntities: ['entity-main-office'],
    },
    fieldWorker: {
      userId: 'user-field-worker',
      authorizedEntities: ['entity-main-office', 'entity-client-site'],
    },
    manager: {
      userId: 'user-manager',
      authorizedEntities: ['entity-main-office', 'entity-branch-office'],
    }
  };

  beforeEach(async () => {
    const mockDailyAttendanceRepo = {
      findByUserIdAndDate: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };

    const mockSessionRepo = {
      findActiveSessionByUserId: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
    };

    const mockLocationRepo = {
      findActiveLocationByUserId: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
    };

    const mockEntityAccessService = {
      getAuthorizedEntities: jest.fn(),
      findNearestAuthorizedEntity: jest.fn(),
      validateEntityAccess: jest.fn(),
    };

    const mockGeospatialService = {
      calculateDistance: jest.fn(),
      isWithinRadius: jest.fn(),
      validateLocationAccess: jest.fn(),
    };

    const mockFraudDetectionService = {
      validateTravelSpeed: jest.fn(),
      performComprehensiveFraudCheck: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        AttendanceValidationService,
        {
          provide: DailyAttendanceRepository,
          useValue: mockDailyAttendanceRepo,
        },
        {
          provide: AttendanceSessionRepository,
          useValue: mockSessionRepo,
        },
        {
          provide: LocationLogRepository,
          useValue: mockLocationRepo,
        },
        {
          provide: EntityAccessService,
          useValue: mockEntityAccessService,
        },
        {
          provide: GeospatialService,
          useValue: mockGeospatialService,
        },
        {
          provide: FraudDetectionService,
          useValue: mockFraudDetectionService,
        },
      ],
    }).compile();

    attendanceService = module.get<AttendanceService>(AttendanceService);
    entityAccessService = module.get<EntityAccessService>(EntityAccessService);
    geospatialService = module.get<GeospatialService>(GeospatialService);
    fraudDetectionService = module.get<FraudDetectionService>(FraudDetectionService);
    validationService = module.get<AttendanceValidationService>(AttendanceValidationService);
    dailyAttendanceRepo = module.get<DailyAttendanceRepository>(DailyAttendanceRepository);
    sessionRepo = module.get<AttendanceSessionRepository>(AttendanceSessionRepository);
    locationRepo = module.get<LocationLogRepository>(LocationLogRepository);
  });

  describe('Complete Clock-In Workflow', () => {
    it('should successfully complete clock-in workflow for office worker', async () => {
      const user = testUsers.officeWorker;
      const location = { latitude: 27.7175, longitude: 85.3245 }; // Near main office
      
      // Mock entity access validation
      jest.spyOn(entityAccessService, 'findNearestAuthorizedEntity')
        .mockResolvedValue({
          entity: testEntities.mainOffice,
          distance: 50,
          isWithinRadius: true,
        });

      // Mock no existing attendance
      jest.spyOn(dailyAttendanceRepo, 'findByUserIdAndDate')
        .mockResolvedValue(null);

      // Mock fraud detection passes
      jest.spyOn(fraudDetectionService, 'performComprehensiveFraudCheck')
        .mockResolvedValue({
          overallRisk: 'LOW',
          flags: [],
          recommendedAction: 'ALLOW',
        });

      // Mock successful save
      const mockAttendance = {
        id: 'attendance-1',
        userId: user.userId,
        date: '2024-01-15',
        clockInTime: new Date(),
        entityId: testEntities.mainOffice.id,
        clockInLatitude: location.latitude,
        clockInLongitude: location.longitude,
      };
      jest.spyOn(dailyAttendanceRepo, 'save')
        .mockResolvedValue(mockAttendance);

      const result = await attendanceService.clockIn(
        user.userId,
        location.latitude,
        location.longitude,
        'Starting work day'
      );

      expect(result.success).toBe(true);
      expect(result.attendance.userId).toBe(user.userId);
      expect(result.attendance.entityId).toBe(testEntities.mainOffice.id);
      expect(result.message).toContain('Successfully clocked in');
    });

    it('should reject clock-in when user is outside authorized entity radius', async () => {
      const user = testUsers.officeWorker;
      const location = { latitude: 28.2096, longitude: 83.9856 }; // Pokhara - far away
      
      // Mock no nearby authorized entities
      jest.spyOn(entityAccessService, 'findNearestAuthorizedEntity')
        .mockResolvedValue(null);

      await expect(
        attendanceService.clockIn(user.userId, location.latitude, location.longitude)
      ).rejects.toThrow('No authorized entities found within acceptable range');
    });

    it('should reject clock-in when fraud detection flags suspicious activity', async () => {
      const user = testUsers.officeWorker;
      const location = { latitude: 27.7175, longitude: 85.3245 };
      
      // Mock entity access validation passes
      jest.spyOn(entityAccessService, 'findNearestAuthorizedEntity')
        .mockResolvedValue({
          entity: testEntities.mainOffice,
          distance: 50,
          isWithinRadius: true,
        });

      // Mock no existing attendance
      jest.spyOn(dailyAttendanceRepo, 'findByUserIdAndDate')
        .mockResolvedValue(null);

      // Mock fraud detection flags suspicious activity
      jest.spyOn(fraudDetectionService, 'performComprehensiveFraudCheck')
        .mockResolvedValue({
          overallRisk: 'HIGH',
          flags: ['impossible_travel_speed', 'location_spoofing'],
          recommendedAction: 'BLOCK',
        });

      await expect(
        attendanceService.clockIn(user.userId, location.latitude, location.longitude)
      ).rejects.toThrow('Suspicious activity detected');
    });

    it('should prevent duplicate clock-in for same day', async () => {
      const user = testUsers.officeWorker;
      const location = { latitude: 27.7175, longitude: 85.3245 };
      
      // Mock existing attendance for today
      const existingAttendance = {
        id: 'attendance-existing',
        userId: user.userId,
        date: '2024-01-15',
        clockInTime: new Date('2024-01-15T09:00:00Z'),
        clockOutTime: null,
      };
      jest.spyOn(dailyAttendanceRepo, 'findByUserIdAndDate')
        .mockResolvedValue(existingAttendance);

      await expect(
        attendanceService.clockIn(user.userId, location.latitude, location.longitude)
      ).rejects.toThrow('already clocked in');
    });
  });

  describe('Complete Clock-Out Workflow', () => {
    it('should successfully complete clock-out workflow', async () => {
      const user = testUsers.officeWorker;
      const location = { latitude: 27.7175, longitude: 85.3245 };
      
      // Mock existing attendance
      const existingAttendance = {
        id: 'attendance-1',
        userId: user.userId,
        date: '2024-01-15',
        clockInTime: new Date('2024-01-15T09:00:00Z'),
        clockOutTime: null,
        entityId: testEntities.mainOffice.id,
      };
      jest.spyOn(dailyAttendanceRepo, 'findByUserIdAndDate')
        .mockResolvedValue(existingAttendance);

      // Mock entity access validation
      jest.spyOn(entityAccessService, 'findNearestAuthorizedEntity')
        .mockResolvedValue({
          entity: testEntities.mainOffice,
          distance: 45,
          isWithinRadius: true,
        });

      // Mock fraud detection passes
      jest.spyOn(fraudDetectionService, 'performComprehensiveFraudCheck')
        .mockResolvedValue({
          overallRisk: 'LOW',
          flags: [],
          recommendedAction: 'ALLOW',
        });

      // Mock successful update
      const updatedAttendance = {
        ...existingAttendance,
        clockOutTime: new Date(),
        clockOutLatitude: location.latitude,
        clockOutLongitude: location.longitude,
        totalHours: 8,
      };
      jest.spyOn(dailyAttendanceRepo, 'save')
        .mockResolvedValue(updatedAttendance);

      const result = await attendanceService.clockOut(
        user.userId,
        location.latitude,
        location.longitude,
        'End of work day'
      );

      expect(result.success).toBe(true);
      expect(result.attendance.clockOutTime).toBeTruthy();
      expect(result.attendance.totalHours).toBe(8);
      expect(result.message).toContain('Successfully clocked out');
    });

    it('should prevent clock-out when user has not clocked in', async () => {
      const user = testUsers.officeWorker;
      const location = { latitude: 27.7175, longitude: 85.3245 };
      
      // Mock no existing attendance
      jest.spyOn(dailyAttendanceRepo, 'findByUserIdAndDate')
        .mockResolvedValue(null);

      await expect(
        attendanceService.clockOut(user.userId, location.latitude, location.longitude)
      ).rejects.toThrow('not clocked in');
    });

    it('should prevent clock-out when user is already clocked out', async () => {
      const user = testUsers.officeWorker;
      const location = { latitude: 27.7175, longitude: 85.3245 };
      
      // Mock already completed attendance
      const completedAttendance = {
        id: 'attendance-1',
        userId: user.userId,
        date: '2024-01-15',
        clockInTime: new Date('2024-01-15T09:00:00Z'),
        clockOutTime: new Date('2024-01-15T17:00:00Z'),
        totalHours: 8,
      };
      jest.spyOn(dailyAttendanceRepo, 'findByUserIdAndDate')
        .mockResolvedValue(completedAttendance);

      await expect(
        attendanceService.clockOut(user.userId, location.latitude, location.longitude)
      ).rejects.toThrow('already clocked out');
    });
  });

  describe('Session Management Workflow', () => {
    it('should successfully complete session check-in workflow', async () => {
      const user = testUsers.officeWorker;
      const location = { latitude: 27.7175, longitude: 85.3245 };
      
      // Mock existing daily attendance
      const dailyAttendance = {
        id: 'attendance-1',
        userId: user.userId,
        date: '2024-01-15',
        clockInTime: new Date('2024-01-15T09:00:00Z'),
        clockOutTime: null,
      };
      jest.spyOn(dailyAttendanceRepo, 'findByUserIdAndDate')
        .mockResolvedValue(dailyAttendance);

      // Mock no active session
      jest.spyOn(sessionRepo, 'findActiveSessionByUserId')
        .mockResolvedValue(null);

      // Mock entity access validation
      jest.spyOn(entityAccessService, 'findNearestAuthorizedEntity')
        .mockResolvedValue({
          entity: testEntities.mainOffice,
          distance: 40,
          isWithinRadius: true,
        });

      // Mock successful session creation
      const mockSession = {
        id: 'session-1',
        userId: user.userId,
        attendanceId: dailyAttendance.id,
        sessionType: 'break',
        checkInTime: new Date(),
        checkInLatitude: location.latitude,
        checkInLongitude: location.longitude,
      };
      jest.spyOn(sessionRepo, 'save')
        .mockResolvedValue(mockSession);

      const result = await attendanceService.sessionCheckIn(
        user.userId,
        location.latitude,
        location.longitude,
        'break',
        'Coffee break'
      );

      expect(result.success).toBe(true);
      expect(result.session.sessionType).toBe('break');
      expect(result.message).toContain('Session check-in successful');
    });

    it('should successfully complete session check-out workflow', async () => {
      const user = testUsers.officeWorker;
      const location = { latitude: 27.7175, longitude: 85.3245 };
      
      // Mock active session
      const activeSession = {
        id: 'session-1',
        userId: user.userId,
        attendanceId: 'attendance-1',
        sessionType: 'break',
        checkInTime: new Date('2024-01-15T10:00:00Z'),
        checkOutTime: null,
      };
      jest.spyOn(sessionRepo, 'findActiveSessionByUserId')
        .mockResolvedValue(activeSession);

      // Mock entity access validation
      jest.spyOn(entityAccessService, 'findNearestAuthorizedEntity')
        .mockResolvedValue({
          entity: testEntities.mainOffice,
          distance: 35,
          isWithinRadius: true,
        });

      // Mock successful session update
      const updatedSession = {
        ...activeSession,
        checkOutTime: new Date(),
        checkOutLatitude: location.latitude,
        checkOutLongitude: location.longitude,
        duration: 15, // 15 minutes
      };
      jest.spyOn(sessionRepo, 'save')
        .mockResolvedValue(updatedSession);

      const result = await attendanceService.sessionCheckOut(
        user.userId,
        location.latitude,
        location.longitude,
        'Break finished'
      );

      expect(result.success).toBe(true);
      expect(result.session.checkOutTime).toBeTruthy();
      expect(result.session.duration).toBe(15);
      expect(result.message).toContain('Session check-out successful');
    });

    it('should prevent session check-in without daily attendance', async () => {
      const user = testUsers.officeWorker;
      const location = { latitude: 27.7175, longitude: 85.3245 };
      
      // Mock no daily attendance
      jest.spyOn(dailyAttendanceRepo, 'findByUserIdAndDate')
        .mockResolvedValue(null);

      await expect(
        attendanceService.sessionCheckIn(user.userId, location.latitude, location.longitude, 'break')
      ).rejects.toThrow('no daily attendance');
    });

    it('should prevent session check-in when active session exists', async () => {
      const user = testUsers.officeWorker;
      const location = { latitude: 27.7175, longitude: 85.3245 };
      
      // Mock existing daily attendance
      const dailyAttendance = {
        id: 'attendance-1',
        userId: user.userId,
        date: '2024-01-15',
        clockInTime: new Date('2024-01-15T09:00:00Z'),
        clockOutTime: null,
      };
      jest.spyOn(dailyAttendanceRepo, 'findByUserIdAndDate')
        .mockResolvedValue(dailyAttendance);

      // Mock active session
      const activeSession = {
        id: 'session-1',
        userId: user.userId,
        attendanceId: dailyAttendance.id,
        sessionType: 'work',
        checkInTime: new Date('2024-01-15T10:00:00Z'),
        checkOutTime: null,
      };
      jest.spyOn(sessionRepo, 'findActiveSessionByUserId')
        .mockResolvedValue(activeSession);

      await expect(
        attendanceService.sessionCheckIn(user.userId, location.latitude, location.longitude, 'break')
      ).rejects.toThrow('active session exists');
    });
  });

  describe('Field Worker Location Workflow', () => {
    it('should successfully complete location check-in workflow for field worker', async () => {
      const user = testUsers.fieldWorker;
      const location = { latitude: 27.6590, longitude: 85.3250 }; // Near client site
      
      // Mock existing daily attendance
      const dailyAttendance = {
        id: 'attendance-1',
        userId: user.userId,
        date: '2024-01-15',
        clockInTime: new Date('2024-01-15T09:00:00Z'),
        clockOutTime: null,
      };
      jest.spyOn(dailyAttendanceRepo, 'findByUserIdAndDate')
        .mockResolvedValue(dailyAttendance);

      // Mock no active location
      jest.spyOn(locationRepo, 'findActiveLocationByUserId')
        .mockResolvedValue(null);

      // Mock entity access validation
      jest.spyOn(entityAccessService, 'validateEntityAccess')
        .mockResolvedValue({
          hasAccess: true,
          assignment: { entityId: testEntities.clientSite.id },
        });

      jest.spyOn(geospatialService, 'calculateDistance')
        .mockReturnValue(80); // 80m from client site

      jest.spyOn(geospatialService, 'isWithinRadius')
        .mockReturnValue(true);

      // Mock successful location creation
      const mockLocation = {
        id: 'location-1',
        userId: user.userId,
        attendanceId: dailyAttendance.id,
        entityId: testEntities.clientSite.id,
        checkInTime: new Date(),
        checkInLatitude: location.latitude,
        checkInLongitude: location.longitude,
        purpose: 'Client meeting',
      };
      jest.spyOn(locationRepo, 'save')
        .mockResolvedValue(mockLocation);

      const result = await attendanceService.locationCheckIn(
        user.userId,
        testEntities.clientSite.id,
        location.latitude,
        location.longitude,
        'Client meeting',
        'Meeting with client about project requirements'
      );

      expect(result.success).toBe(true);
      expect(result.locationLog.entityId).toBe(testEntities.clientSite.id);
      expect(result.locationLog.purpose).toBe('Client meeting');
      expect(result.message).toContain('Location check-in successful');
    });

    it('should successfully complete location check-out workflow', async () => {
      const user = testUsers.fieldWorker;
      const location = { latitude: 27.6590, longitude: 85.3250 };
      
      // Mock active location
      const activeLocation = {
        id: 'location-1',
        userId: user.userId,
        attendanceId: 'attendance-1',
        entityId: testEntities.clientSite.id,
        checkInTime: new Date('2024-01-15T11:00:00Z'),
        checkOutTime: null,
        purpose: 'Client meeting',
      };
      jest.spyOn(locationRepo, 'findActiveLocationByUserId')
        .mockResolvedValue(activeLocation);

      jest.spyOn(geospatialService, 'calculateDistance')
        .mockReturnValue(75);

      jest.spyOn(geospatialService, 'isWithinRadius')
        .mockReturnValue(true);

      // Mock successful location update
      const updatedLocation = {
        ...activeLocation,
        checkOutTime: new Date(),
        checkOutLatitude: location.latitude,
        checkOutLongitude: location.longitude,
        visitDuration: 120, // 2 hours
      };
      jest.spyOn(locationRepo, 'save')
        .mockResolvedValue(updatedLocation);

      const result = await attendanceService.locationCheckOut(
        user.userId,
        location.latitude,
        location.longitude,
        'Meeting completed successfully'
      );

      expect(result.success).toBe(true);
      expect(result.locationLog.checkOutTime).toBeTruthy();
      expect(result.locationLog.visitDuration).toBe(120);
      expect(result.message).toContain('Location check-out successful');
    });

    it('should prevent location check-in without entity access', async () => {
      const user = testUsers.officeWorker; // Only has access to main office
      const location = { latitude: 27.6590, longitude: 85.3250 };
      
      // Mock existing daily attendance
      const dailyAttendance = {
        id: 'attendance-1',
        userId: user.userId,
        date: '2024-01-15',
        clockInTime: new Date('2024-01-15T09:00:00Z'),
        clockOutTime: null,
      };
      jest.spyOn(dailyAttendanceRepo, 'findByUserIdAndDate')
        .mockResolvedValue(dailyAttendance);

      // Mock entity access denied
      jest.spyOn(entityAccessService, 'validateEntityAccess')
        .mockRejectedValue(new Error('Entity access denied'));

      await expect(
        attendanceService.locationCheckIn(
          user.userId,
          testEntities.clientSite.id,
          location.latitude,
          location.longitude,
          'Unauthorized visit'
        )
      ).rejects.toThrow('Entity access denied');
    });

    it('should prevent location check-in when outside entity radius', async () => {
      const user = testUsers.fieldWorker;
      const location = { latitude: 28.2096, longitude: 83.9856 }; // Pokhara - far from client site
      
      // Mock existing daily attendance
      const dailyAttendance = {
        id: 'attendance-1',
        userId: user.userId,
        date: '2024-01-15',
        clockInTime: new Date('2024-01-15T09:00:00Z'),
        clockOutTime: null,
      };
      jest.spyOn(dailyAttendanceRepo, 'findByUserIdAndDate')
        .mockResolvedValue(dailyAttendance);

      // Mock entity access validation passes
      jest.spyOn(entityAccessService, 'validateEntityAccess')
        .mockResolvedValue({
          hasAccess: true,
          assignment: { entityId: testEntities.clientSite.id },
        });

      jest.spyOn(geospatialService, 'calculateDistance')
        .mockReturnValue(200000); // 200km away

      jest.spyOn(geospatialService, 'isWithinRadius')
        .mockReturnValue(false);

      await expect(
        attendanceService.locationCheckIn(
          user.userId,
          testEntities.clientSite.id,
          location.latitude,
          location.longitude,
          'Remote visit'
        )
      ).rejects.toThrow('outside the required radius');
    });
  });

  describe('Travel Speed Analysis Integration', () => {
    it('should detect and flag impossible travel speeds between locations', async () => {
      const user = testUsers.fieldWorker;
      const previousLocation = { latitude: 27.7172, longitude: 85.3240 }; // Kathmandu
      const currentLocation = { latitude: 28.2096, longitude: 83.9856 }; // Pokhara
      const timeGap = 10; // 10 minutes for 200km = impossible
      
      // Mock previous attendance record
      const previousAttendance = {
        id: 'attendance-prev',
        userId: user.userId,
        date: '2024-01-15',
        clockInTime: new Date(Date.now() - timeGap * 60 * 1000),
        clockInLatitude: previousLocation.latitude,
        clockInLongitude: previousLocation.longitude,
      };

      // Mock fraud detection flags impossible speed
      jest.spyOn(fraudDetectionService, 'performComprehensiveFraudCheck')
        .mockResolvedValue({
          overallRisk: 'HIGH',
          flags: ['impossible_travel_speed'],
          recommendedAction: 'BLOCK',
          details: {
            travelSpeed: 1200, // 1200 km/h
            distance: 200000,
            timeMinutes: timeGap,
          },
        });

      await expect(
        attendanceService.clockIn(
          user.userId,
          currentLocation.latitude,
          currentLocation.longitude
        )
      ).rejects.toThrow('impossible travel speed');
    });

    it('should allow reasonable travel speeds', async () => {
      const user = testUsers.fieldWorker;
      const previousLocation = { latitude: 27.7172, longitude: 85.3240 };
      const currentLocation = { latitude: 27.7272, longitude: 85.3340 }; // 1.4km away
      const timeGap = 20; // 20 minutes for 1.4km = reasonable
      
      // Mock entity access validation
      jest.spyOn(entityAccessService, 'findNearestAuthorizedEntity')
        .mockResolvedValue({
          entity: testEntities.branchOffice,
          distance: 50,
          isWithinRadius: true,
        });

      // Mock no existing attendance
      jest.spyOn(dailyAttendanceRepo, 'findByUserIdAndDate')
        .mockResolvedValue(null);

      // Mock fraud detection passes
      jest.spyOn(fraudDetectionService, 'performComprehensiveFraudCheck')
        .mockResolvedValue({
          overallRisk: 'LOW',
          flags: [],
          recommendedAction: 'ALLOW',
          details: {
            travelSpeed: 4.2, // 4.2 km/h (walking speed)
            distance: 1400,
            timeMinutes: timeGap,
          },
        });

      // Mock successful save
      const mockAttendance = {
        id: 'attendance-1',
        userId: user.userId,
        date: '2024-01-15',
        clockInTime: new Date(),
        entityId: testEntities.branchOffice.id,
      };
      jest.spyOn(dailyAttendanceRepo, 'save')
        .mockResolvedValue(mockAttendance);

      const result = await attendanceService.clockIn(
        user.userId,
        currentLocation.latitude,
        currentLocation.longitude
      );

      expect(result.success).toBe(true);
      expect(result.fraudCheck.overallRisk).toBe('LOW');
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle database connection failures gracefully', async () => {
      const user = testUsers.officeWorker;
      const location = { latitude: 27.7175, longitude: 85.3245 };
      
      // Mock database failure
      jest.spyOn(dailyAttendanceRepo, 'findByUserIdAndDate')
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(
        attendanceService.clockIn(user.userId, location.latitude, location.longitude)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid coordinates gracefully', async () => {
      const user = testUsers.officeWorker;
      
      await expect(
        attendanceService.clockIn(user.userId, 91, 181) // Invalid coordinates
      ).rejects.toThrow('Invalid coordinates');
    });

    it('should handle concurrent operations correctly', async () => {
      const user = testUsers.officeWorker;
      const location = { latitude: 27.7175, longitude: 85.3245 };
      
      // Simulate concurrent clock-in attempts
      const promises = [
        attendanceService.clockIn(user.userId, location.latitude, location.longitude),
        attendanceService.clockIn(user.userId, location.latitude, location.longitude),
      ];

      // One should succeed, one should fail
      const results = await Promise.allSettled(promises);
      const successes = results.filter(r => r.status === 'fulfilled').length;
      const failures = results.filter(r => r.status === 'rejected').length;

      expect(successes).toBe(1);
      expect(failures).toBe(1);
    });
  });

  describe('Performance Tests', () => {
    it('should complete clock-in workflow within acceptable time', async () => {
      const user = testUsers.officeWorker;
      const location = { latitude: 27.7175, longitude: 85.3245 };
      
      // Setup mocks for successful flow
      jest.spyOn(entityAccessService, 'findNearestAuthorizedEntity')
        .mockResolvedValue({
          entity: testEntities.mainOffice,
          distance: 50,
          isWithinRadius: true,
        });

      jest.spyOn(dailyAttendanceRepo, 'findByUserIdAndDate')
        .mockResolvedValue(null);

      jest.spyOn(fraudDetectionService, 'performComprehensiveFraudCheck')
        .mockResolvedValue({
          overallRisk: 'LOW',
          flags: [],
          recommendedAction: 'ALLOW',
        });

      jest.spyOn(dailyAttendanceRepo, 'save')
        .mockResolvedValue({
          id: 'attendance-1',
          userId: user.userId,
          date: '2024-01-15',
          clockInTime: new Date(),
        });

      const startTime = Date.now();
      
      await attendanceService.clockIn(user.userId, location.latitude, location.longitude);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle multiple concurrent users efficiently', async () => {
      const users = [
        testUsers.officeWorker,
        testUsers.fieldWorker,
        testUsers.manager,
      ];
      const location = { latitude: 27.7175, longitude: 85.3245 };

      // Setup mocks for all users
      jest.spyOn(entityAccessService, 'findNearestAuthorizedEntity')
        .mockResolvedValue({
          entity: testEntities.mainOffice,
          distance: 50,
          isWithinRadius: true,
        });

      jest.spyOn(dailyAttendanceRepo, 'findByUserIdAndDate')
        .mockResolvedValue(null);

      jest.spyOn(fraudDetectionService, 'performComprehensiveFraudCheck')
        .mockResolvedValue({
          overallRisk: 'LOW',
          flags: [],
          recommendedAction: 'ALLOW',
        });

      jest.spyOn(dailyAttendanceRepo, 'save')
        .mockImplementation((attendance) => Promise.resolve({
          ...attendance,
          id: `attendance-${Math.random()}`,
        }));

      const startTime = Date.now();
      
      const promises = users.map(user =>
        attendanceService.clockIn(user.userId, location.latitude, location.longitude)
      );

      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle 3 concurrent users within 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });
});
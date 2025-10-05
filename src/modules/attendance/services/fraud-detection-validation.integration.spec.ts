import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FraudDetectionService } from './fraud-detection.service';
import { AttendanceValidationService } from './attendance-validation.service';
import { TransactionManagerService } from './transaction-manager.service';
import { GeospatialService } from './geospatial.service';
import { DailyAttendanceRepository } from '../repositories/daily-attendance.repository';
import { AttendanceSessionRepository } from '../repositories/attendance-session.repository';
import { LocationLogRepository } from '../repositories/location-log.repository';
import { DailyAttendance } from '../entities/daily-attendance.entity';
import { AttendanceSession } from '../entities/attendance-session.entity';
import { LocationLog } from '../entities/location-log.entity';
import { User } from '../../user/entities/user.entity';
import { Entity } from '../../entity/entities/entity.entity';
import {
  AttendanceStateException,
  FraudDetectionException,
  GeospatialValidationException,
} from '../../../common/exceptions/business-logic.exceptions';

/**
 * Integration tests for fraud detection and validation services
 * Tests pattern analysis, transaction management, and data integrity validation
 */
describe('Fraud Detection and Validation Integration Tests', () => {
  let module: TestingModule;
  let fraudDetectionService: FraudDetectionService;
  let validationService: AttendanceValidationService;
  let transactionManager: TransactionManagerService;
  let dataSource: DataSource;

  const testDbConfig = {
    type: 'postgres' as const,
    host: 'localhost',
    port: 5432,
    username: 'test',
    password: 'test',
    database: 'attendance_test',
    synchronize: true,
    dropSchema: true,
    entities: [DailyAttendance, AttendanceSession, LocationLog, User, Entity],
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [TypeOrmModule.forRoot(testDbConfig), TypeOrmModule.forFeature([DailyAttendance, AttendanceSession, LocationLog, User, Entity])],
      providers: [
        FraudDetectionService,
        AttendanceValidationService,
        TransactionManagerService,
        GeospatialService,
        DailyAttendanceRepository,
        AttendanceSessionRepository,
        LocationLogRepository,
      ],
    }).compile();

    fraudDetectionService = module.get<FraudDetectionService>(FraudDetectionService);
    validationService = module.get<AttendanceValidationService>(AttendanceValidationService);
    transactionManager = module.get<TransactionManagerService>(TransactionManagerService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    // Clean up data before each test
    await dataSource.query('DELETE FROM attendance_sessions');
    await dataSource.query('DELETE FROM location_logs');
    await dataSource.query('DELETE FROM daily_attendance');
    await dataSource.query('DELETE FROM entities');
    await dataSource.query('DELETE FROM users');
  });

  describe('Pattern Analysis', () => {
    it('should detect speed violation patterns', async () => {
      const userId = 'test-user-123';
      
      // Create test user
      await dataSource.getRepository(User).save({
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        kahaId: 'KAHA123',
        businessId: 'business-1',
      });

      // Create multiple attendance records with speed violations
      const baseDate = new Date('2025-10-01');
      for (let i = 0; i < 5; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        
        await dataSource.getRepository(DailyAttendance).save({
          userId,
          date,
          clockInTime: new Date(),
          clockInLatitude: 27.7172,
          clockInLongitude: 85.3240,
          clockOutTime: new Date(),
          clockOutLatitude: 27.8172, // Different location
          clockOutLongitude: 85.4240,
          travelSpeedKmph: 250, // Impossible speed
          isFlagged: true,
          flagReason: 'Impossible travel speed: 250km/h',
          totalHours: 8,
          status: 'Present',
        });
      }

      // Analyze patterns
      const patternAnalysis = await fraudDetectionService.analyzeUserPatterns(userId);

      expect(patternAnalysis.hasPattern).toBe(true);
      expect(patternAnalysis.patternType).toBe('speed_violations');
      expect(patternAnalysis.occurrences).toBeGreaterThanOrEqual(5);
      expect(patternAnalysis.riskLevel).toBe('high');
      expect(patternAnalysis.details.speedViolations.count).toBe(5);
      expect(patternAnalysis.details.speedViolations.maxSpeed).toBe(250);
    });

    it('should detect location-based patterns', async () => {
      const userId = 'test-user-456';
      
      // Create test user
      await dataSource.getRepository(User).save({
        id: userId,
        name: 'Test User 2',
        email: 'test2@example.com',
        kahaId: 'KAHA456',
        businessId: 'business-1',
      });

      // Create multiple attendance records with location violations at same suspicious location
      const baseDate = new Date('2025-10-01');
      const suspiciousLat = 27.7172;
      const suspiciousLng = 85.3240;
      
      for (let i = 0; i < 6; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        
        await dataSource.getRepository(DailyAttendance).save({
          userId,
          date,
          clockInTime: new Date(),
          clockInLatitude: suspiciousLat,
          clockInLongitude: suspiciousLng,
          isFlagged: true,
          flagReason: 'location validation failed',
          totalHours: 8,
          status: 'Present',
        });
      }

      // Analyze patterns
      const patternAnalysis = await fraudDetectionService.analyzeUserPatterns(userId);

      expect(patternAnalysis.hasPattern).toBe(true);
      expect(patternAnalysis.patternType).toBe('location_anomalies');
      expect(patternAnalysis.details.locationPatterns.count).toBe(6);
      expect(patternAnalysis.details.locationPatterns.repeatedLocations).toBeGreaterThan(0);
    });
  });

  describe('Transaction Management', () => {
    it('should prevent concurrent clock-in operations', async () => {
      const userId = 'concurrent-user-123';
      
      // Create test user
      await dataSource.getRepository(User).save({
        id: userId,
        name: 'Concurrent User',
        email: 'concurrent@example.com',
        kahaId: 'KAHA789',
        businessId: 'business-1',
      });

      const clockInData = {
        id: 'attendance-1',
        date: new Date(),
        clockInTime: new Date(),
        clockInLatitude: 27.7172,
        clockInLongitude: 85.3240,
        notes: 'Test clock-in',
        status: 'Present',
      };

      // Mock validation function
      const mockValidation = jest.fn().mockResolvedValue(undefined);

      // Start first operation
      const firstOperation = transactionManager.executeClockIn(userId, clockInData, mockValidation);

      // Start second concurrent operation
      const secondOperation = transactionManager.executeClockIn(userId, { ...clockInData, id: 'attendance-2' }, mockValidation);

      // Both should complete, but second should wait for first
      const results = await Promise.all([firstOperation, secondOperation]);
      
      expect(results).toHaveLength(2);
      expect(mockValidation).toHaveBeenCalledTimes(2);
    });

    it('should handle transaction rollback on validation failure', async () => {
      const userId = 'rollback-user-123';
      
      const clockInData = {
        id: 'attendance-rollback',
        date: new Date(),
        clockInTime: new Date(),
        clockInLatitude: 27.7172,
        clockInLongitude: 85.3240,
        notes: 'Test rollback',
        status: 'Present',
      };

      // Mock validation function that throws error
      const mockValidation = jest.fn().mockRejectedValue(new Error('Validation failed'));

      // Operation should fail and rollback
      await expect(
        transactionManager.executeClockIn(userId, clockInData, mockValidation)
      ).rejects.toThrow('Validation failed');

      // Verify no attendance record was created
      const attendanceCount = await dataSource.query(
        'SELECT COUNT(*) FROM daily_attendance WHERE user_id = $1',
        [userId]
      );
      expect(parseInt(attendanceCount[0].count)).toBe(0);
    });
  });

  describe('Validation Service', () => {
    it('should validate coordinates correctly', async () => {
      const userId = 'validation-user-123';
      
      // Test invalid latitude
      await expect(
        validationService.validateClockIn(
          dataSource.createQueryRunner(),
          userId,
          91, // Invalid latitude
          85.3240,
          new Date(),
        )
      ).rejects.toThrow(GeospatialValidationException);

      // Test invalid longitude
      await expect(
        validationService.validateClockIn(
          dataSource.createQueryRunner(),
          userId,
          27.7172,
          181, // Invalid longitude
          new Date(),
        )
      ).rejects.toThrow(GeospatialValidationException);
    });

    it('should detect attendance state violations', async () => {
      const userId = 'state-user-123';
      const queryRunner = dataSource.createQueryRunner();
      
      // Create attendance record without clock-in
      const attendance = {
        id: 'attendance-state-test',
        user_id: userId,
        date: new Date(),
        clock_in_time: null, // No clock-in time
      };

      // Should throw error for clock-out without clock-in
      await expect(
        validationService.validateClockOut(
          queryRunner,
          attendance,
          userId,
          27.7172,
          85.3240,
        )
      ).rejects.toThrow(AttendanceStateException);
    });
  });

  describe('Referential Integrity', () => {
    it('should validate user-entity relationships', async () => {
      const userId = 'integrity-user-123';
      const entityId = 'integrity-entity-123';

      // Test with non-existent user-entity relationship
      const integrityCheck = await fraudDetectionService.validateUserEntityIntegrity(userId, entityId);
      
      expect(integrityCheck.isValid).toBe(false);
      expect(integrityCheck.errors).toContain('Failed to validate user-entity relationship');
    });
  });

  describe('Fraud Detection Thresholds', () => {
    it('should flag impossible travel speeds', async () => {
      const userId = 'speed-test-user';
      
      // Create previous attendance
      await dataSource.getRepository(DailyAttendance).save({
        userId,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        clockOutTime: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        clockOutLatitude: 27.7172,
        clockOutLongitude: 85.3240,
        totalHours: 8,
        status: 'Present',
      });

      // Analyze clock-in at distant location (should be impossible travel speed)
      const fraudAnalysis = await fraudDetectionService.analyzeClockInLocation(
        userId,
        28.2096, // Kathmandu to Pokhara distance
        83.9856,
      );

      expect(fraudAnalysis.isSuspicious).toBe(true);
      expect(fraudAnalysis.riskLevel).toBe('high');
      expect(fraudAnalysis.travelSpeedKmph).toBeGreaterThan(200);
      expect(fraudAnalysis.flagReason).toContain('Impossible travel speed');
    });

    it('should handle reasonable travel speeds', async () => {
      const userId = 'normal-speed-user';
      
      // Create previous attendance with recent clock-out
      await dataSource.getRepository(DailyAttendance).save({
        userId,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        clockOutTime: new Date(Date.now() - 16 * 60 * 60 * 1000), // 16 hours ago
        clockOutLatitude: 27.7172,
        clockOutLongitude: 85.3240,
        totalHours: 8,
        status: 'Present',
      });

      // Analyze clock-in at nearby location (reasonable travel speed)
      const fraudAnalysis = await fraudDetectionService.analyzeClockInLocation(
        userId,
        27.7200, // Nearby location
        85.3300,
      );

      expect(fraudAnalysis.isSuspicious).toBe(false);
      expect(fraudAnalysis.riskLevel).toBe('low');
    });
  });

  describe('Concurrent Operation Handling', () => {
    it('should track active locks', async () => {
      const userId = 'lock-test-user';
      
      // Check initial state
      expect(transactionManager.getActiveLocks()).toHaveLength(0);

      // Start operation (don't await immediately)
      const operation = transactionManager.executeWithLock(
        userId,
        async () => {
          // Simulate some work
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'success';
        },
        'test_operation',
      );

      // Check that lock is active
      expect(transactionManager.getActiveLocks()).toContain(`${userId}_test_operation`);

      // Wait for completion
      const result = await operation;
      expect(result).toBe('success');

      // Check that lock is cleared
      expect(transactionManager.getActiveLocks()).toHaveLength(0);
    });

    it('should clear all locks when requested', async () => {
      const userId = 'clear-test-user';
      
      // Start operation but don't wait
      const operation = transactionManager.executeWithLock(
        userId,
        async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return 'success';
        },
        'test_operation',
      );

      // Verify lock exists
      expect(transactionManager.getActiveLocks()).toContain(`${userId}_test_operation`);

      // Clear all locks
      transactionManager.clearAllLocks();
      expect(transactionManager.getActiveLocks()).toHaveLength(0);

      // Operation should still complete
      const result = await operation;
      expect(result).toBe('success');
    });
  });
});
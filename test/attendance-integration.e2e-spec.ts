import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AttendanceModule } from '../src/modules/attendance/attendance.module';
import { DepartmentModule } from '../src/modules/department/department.module';
import { HolidayModule } from '../src/modules/holiday/holiday.module';
import { AttendanceRequestService } from '../src/modules/attendance/services/attendance-request.service';
import { DepartmentScheduleService } from '../src/modules/department/services/department-schedule.service';
import { AttendanceService } from '../src/modules/attendance/services/attendance.service';
import { ReportingService } from '../src/modules/attendance/services/reporting.service';
import { HolidayService } from '../src/modules/holiday/services/holiday.service';

/**
 * Integration tests for attendance system with department schedules, 
 * attendance requests, remote work, and holiday management
 */
describe('Attendance Integration (e2e)', () => {
  let app: INestApplication;
  let attendanceService: AttendanceService;
  let attendanceRequestService: AttendanceRequestService;
  let departmentScheduleService: DepartmentScheduleService;
  let reportingService: ReportingService;
  let holidayService: HolidayService;

  // Test data
  const testUser = {
    userId: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    departmentId: 'test-dept-123',
  };

  const testManager = {
    userId: 'test-manager-123',
    name: 'Test Manager',
    email: 'manager@example.com',
    departmentId: 'test-dept-123',
  };

  const testDepartment = {
    departmentId: 'test-dept-123',
    name: 'Test Department',
    businessId: 'test-business-123',
  };

  const testEntity = {
    entityId: 'test-entity-123',
    name: 'Test Office',
    latitude: 27.7172,
    longitude: 85.3240,
    radiusMeters: 100,
    businessId: 'test-business-123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        AttendanceModule,
        DepartmentModule,
        HolidayModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get service instances
    attendanceService = moduleFixture.get<AttendanceService>(AttendanceService);
    attendanceRequestService = moduleFixture.get<AttendanceRequestService>(AttendanceRequestService);
    departmentScheduleService = moduleFixture.get<DepartmentScheduleService>(DepartmentScheduleService);
    reportingService = moduleFixture.get<ReportingService>(ReportingService);
    holidayService = moduleFixture.get<HolidayService>(HolidayService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Department Schedule Integration', () => {
    let scheduleId: string;

    beforeEach(async () => {
      // Create test department schedule
      const schedule = await departmentScheduleService.createSchedule(testDepartment.departmentId, {
        name: 'Standard Hours',
        startTime: '09:00',
        endTime: '18:00',
        workDays: [1, 2, 3, 4, 5], // Monday to Friday
        isActive: true,
        description: 'Standard working hours',
      });
      scheduleId = schedule.id;
    });

    it('should validate clock-in time against department schedule', async () => {
      // Test clock-in within working hours
      const withinHoursTime = new Date();
      withinHoursTime.setHours(10, 0, 0, 0); // 10:00 AM

      const validation = await departmentScheduleService.validateAttendanceTime(
        testDepartment.departmentId,
        withinHoursTime,
      );

      expect(validation.isValid).toBe(true);
      expect(validation.compliance?.isWithinSchedule).toBe(true);
    });

    it('should flag clock-in outside working hours', async () => {
      // Test clock-in outside working hours
      const outsideHoursTime = new Date();
      outsideHoursTime.setHours(7, 0, 0, 0); // 7:00 AM (before 9:00 AM)

      const validation = await departmentScheduleService.validateAttendanceTime(
        testDepartment.departmentId,
        outsideHoursTime,
      );

      expect(validation.isValid).toBe(false);
      expect(validation.compliance?.isWithinSchedule).toBe(false);
      expect(validation.compliance?.isWithinHours).toBe(false);
    });

    it('should flag attendance on non-work days', async () => {
      // Test attendance on Sunday (day 0)
      const sundayTime = new Date();
      sundayTime.setDay(0); // Sunday
      sundayTime.setHours(10, 0, 0, 0);

      const validation = await departmentScheduleService.validateAttendanceTime(
        testDepartment.departmentId,
        sundayTime,
      );

      expect(validation.isValid).toBe(false);
      expect(validation.compliance?.isWorkDay).toBe(false);
    });

    it('should include schedule compliance in reporting', async () => {
      // Create reporting relationship
      await reportingService.createReportingStructure({
        employeeId: testUser.userId,
        managerId: testManager.userId,
        startDate: new Date(),
      });

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const report = await reportingService.getTeamAttendanceSummary(
        testManager.userId,
        startDate,
        endDate,
      );

      expect(report.scheduleCompliance).toBeDefined();
      expect(report.scheduleCompliance.overallComplianceRate).toBeGreaterThanOrEqual(0);
      expect(report.teamMemberStats[0]?.scheduleCompliance).toBeDefined();
    });
  });

  describe('Attendance Request Workflow', () => {
    it('should create attendance request', async () => {
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() - 1); // Yesterday

      const request = await attendanceRequestService.createRequest(testUser.userId, {
        requestedDate: requestDate,
        reason: 'Forgot to clock in',
        clockInTime: '09:00',
        clockOutTime: '18:00',
        workLocation: 'OFFICE',
      });

      expect(request).toBeDefined();
      expect(request.userId).toBe(testUser.userId);
      expect(request.status).toBe('PENDING');
    });

    it('should approve attendance request and create attendance record', async () => {
      // Create request
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() - 1);

      const request = await attendanceRequestService.createRequest(testUser.userId, {
        requestedDate: requestDate,
        reason: 'System error',
        clockInTime: '09:30',
        clockOutTime: '17:30',
        workLocation: 'OFFICE',
      });

      // Approve request
      const approvedRequest = await attendanceRequestService.approveRequest(
        request.id,
        testManager.userId,
        'Approved - valid reason',
      );

      expect(approvedRequest.status).toBe('APPROVED');
      expect(approvedRequest.approvedBy).toBe(testManager.userId);
      expect(approvedRequest.createdAttendanceId).toBeDefined();

      // Verify attendance record was created
      const attendance = await attendanceService.getAttendanceByDate(
        testUser.userId,
        requestDate,
      );

      expect(attendance).toBeDefined();
      expect(attendance?.clockInTime).toBeDefined();
      expect(attendance?.clockOutTime).toBeDefined();
    });

    it('should reject attendance request', async () => {
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() - 1);

      const request = await attendanceRequestService.createRequest(testUser.userId, {
        requestedDate: requestDate,
        reason: 'Invalid reason',
        clockInTime: '09:00',
        clockOutTime: '18:00',
        workLocation: 'OFFICE',
      });

      const rejectedRequest = await attendanceRequestService.rejectRequest(
        request.id,
        testManager.userId,
        'Insufficient documentation',
      );

      expect(rejectedRequest.status).toBe('REJECTED');
      expect(rejectedRequest.approvedBy).toBe(testManager.userId);
      expect(rejectedRequest.createdAttendanceId).toBeNull();
    });

    it('should include attendance request stats in team reports', async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const report = await reportingService.getTeamAttendanceSummary(
        testManager.userId,
        startDate,
        endDate,
      );

      expect(report.attendanceRequests).toBeDefined();
      expect(report.attendanceRequests.total).toBeGreaterThanOrEqual(0);
      expect(report.attendanceRequests.approvalRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Remote Work Integration', () => {
    it('should handle remote work clock-in with validation', async () => {
      const remoteClockIn = await attendanceService.remoteWorkClockIn(testUser.userId, {
        latitude: 27.7000,
        longitude: 85.3000,
        remoteLocation: 'Home Office',
        notes: 'Working from home today',
      });

      expect(remoteClockIn).toBeDefined();
      expect(remoteClockIn.workLocation).toBe('REMOTE');
      expect(remoteClockIn.remoteLocation).toBe('Home Office');
    });

    it('should validate remote work patterns for fraud detection', async () => {
      // Multiple remote work entries with same exact coordinates should be flagged
      const exactCoords = { latitude: 27.7000, longitude: 85.3000 };

      for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        await attendanceService.remoteWorkClockIn(testUser.userId, {
          ...exactCoords,
          remoteLocation: 'Home Office',
        });
      }

      // The fraud detection should flag this pattern
      // This would be checked in the actual attendance records
    });
  });

  describe('Holiday Integration', () => {
    it('should prevent attendance on holidays', async () => {
      // Create a holiday for today
      const today = new Date();
      await holidayService.createHoliday({
        name: 'Test Holiday',
        date: today,
        type: 'NATIONAL',
        isRecurring: false,
      });

      // Attempt to clock in on holiday should fail
      try {
        await attendanceService.clockIn(testUser.userId, {
          latitude: testEntity.latitude,
          longitude: testEntity.longitude,
        });
        fail('Should have thrown an error for holiday attendance');
      } catch (error) {
        expect(error.message).toContain('holiday');
      }
    });

    it('should exclude holidays from attendance calculations', async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const holidays = await reportingService.getHolidaysInRange(
        startDate,
        endDate,
        testDepartment.departmentId,
      );

      expect(holidays).toBeDefined();
      expect(Array.isArray(holidays)).toBe(true);
    });
  });

  describe('API Endpoints Integration', () => {
    it('should create department schedule via API', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/departments/${testDepartment.departmentId}/schedule`)
        .send({
          name: 'API Test Schedule',
          startTime: '08:00',
          endTime: '17:00',
          workDays: [1, 2, 3, 4, 5],
          isActive: true,
        })
        .expect(201);

      expect(response.body.name).toBe('API Test Schedule');
      expect(response.body.startTime).toBe('08:00:00');
    });

    it('should get user schedule via API', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/attendance/my-schedule')
        .set('Authorization', `Bearer ${testUser.userId}`) // Mock JWT
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should create attendance request via API', async () => {
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() - 1);

      const response = await request(app.getHttpServer())
        .post('/api/attendance/request')
        .set('Authorization', `Bearer ${testUser.userId}`)
        .send({
          requestedDate: requestDate.toISOString().split('T')[0],
          reason: 'API test request',
          clockInTime: '09:00',
          clockOutTime: '18:00',
          workLocation: 'OFFICE',
        })
        .expect(201);

      expect(response.body.reason).toBe('API test request');
      expect(response.body.status).toBe('PENDING');
    });

    it('should approve attendance request via API', async () => {
      // First create a request
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() - 1);

      const createResponse = await request(app.getHttpServer())
        .post('/api/attendance/request')
        .set('Authorization', `Bearer ${testUser.userId}`)
        .send({
          requestedDate: requestDate.toISOString().split('T')[0],
          reason: 'API approval test',
          clockInTime: '09:00',
          clockOutTime: '18:00',
          workLocation: 'OFFICE',
        });

      const requestId = createResponse.body.id;

      // Then approve it
      const approveResponse = await request(app.getHttpServer())
        .post(`/api/attendance/requests/approve/${requestId}`)
        .set('Authorization', `Bearer ${testManager.userId}`)
        .send({
          comments: 'Approved via API',
        })
        .expect(200);

      expect(approveResponse.body.status).toBe('APPROVED');
    });

    it('should get team attendance with schedule compliance', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/attendance/team')
        .set('Authorization', `Bearer ${testManager.userId}`)
        .query({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        })
        .expect(200);

      expect(response.body.scheduleCompliance).toBeDefined();
      expect(response.body.attendanceRequests).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle schedule validation queries efficiently', async () => {
      const startTime = Date.now();
      
      // Perform multiple schedule validations
      const promises = [];
      for (let i = 0; i < 100; i++) {
        const testTime = new Date();
        testTime.setHours(9 + (i % 8), 0, 0, 0);
        
        promises.push(
          departmentScheduleService.validateAttendanceTime(
            testDepartment.departmentId,
            testTime,
          )
        );
      }

      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 100 validations in under 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle team reporting queries efficiently', async () => {
      const startTime = Date.now();
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      await reportingService.getTeamAttendanceSummary(
        testManager.userId,
        startDate,
        endDate,
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete team report in under 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid department schedule gracefully', async () => {
      try {
        await departmentScheduleService.createSchedule('invalid-dept-id', {
          name: 'Invalid Schedule',
          startTime: '25:00', // Invalid time
          endTime: '18:00',
          workDays: [1, 2, 3, 4, 5],
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toContain('time');
      }
    });

    it('should handle attendance request for future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      try {
        await attendanceRequestService.createRequest(testUser.userId, {
          requestedDate: futureDate,
          reason: 'Future request',
          clockInTime: '09:00',
          clockOutTime: '18:00',
          workLocation: 'OFFICE',
        });
        fail('Should have thrown error for future date');
      } catch (error) {
        expect(error.message).toContain('future');
      }
    });

    it('should handle duplicate attendance requests', async () => {
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() - 1);

      // Create first request
      await attendanceRequestService.createRequest(testUser.userId, {
        requestedDate: requestDate,
        reason: 'First request',
        clockInTime: '09:00',
        clockOutTime: '18:00',
        workLocation: 'OFFICE',
      });

      // Attempt to create duplicate
      try {
        await attendanceRequestService.createRequest(testUser.userId, {
          requestedDate: requestDate,
          reason: 'Duplicate request',
          clockInTime: '09:00',
          clockOutTime: '18:00',
          workLocation: 'OFFICE',
        });
        fail('Should have thrown error for duplicate request');
      } catch (error) {
        expect(error.message).toContain('duplicate');
      }
    });
  });
});
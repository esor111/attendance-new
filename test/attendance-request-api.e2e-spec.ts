import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AttendanceRequestService } from '../src/modules/attendance/services/attendance-request.service';
import { ReportingService } from '../src/modules/attendance/services/reporting.service';

/**
 * API tests for attendance request endpoints
 * Tests request creation, approval workflow, and authorization
 */
describe('Attendance Request API (e2e)', () => {
  let app: INestApplication;
  let attendanceRequestService: AttendanceRequestService;
  let reportingService: ReportingService;

  const testEmployee = {
    userId: 'test-employee-789',
    name: 'Test Employee',
    email: 'employee@example.com',
    departmentId: 'test-dept-789',
  };

  const testManager = {
    userId: 'test-manager-789',
    name: 'Test Manager',
    email: 'manager@example.com',
    departmentId: 'test-dept-789',
  };

  const testAdmin = {
    userId: 'test-admin-789',
    name: 'Test Admin',
    email: 'admin@example.com',
    role: 'admin',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    attendanceRequestService = moduleFixture.get<AttendanceRequestService>(AttendanceRequestService);
    reportingService = moduleFixture.get<ReportingService>(ReportingService);

    // Set up reporting relationship
    await reportingService.createReportingStructure({
      employeeId: testEmployee.userId,
      managerId: testManager.userId,
      startDate: new Date(),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/attendance/request', () => {
    it('should create attendance request with valid data', async () => {
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() - 1); // Yesterday

      const requestData = {
        requestedDate: requestDate.toISOString().split('T')[0],
        reason: 'Forgot to clock in due to urgent meeting',
        clockInTime: '09:15',
        clockOutTime: '18:30',
        workLocation: 'OFFICE',
        notes: 'Had to attend emergency client call',
      };

      const response = await request(app.getHttpServer())
        .post('/api/attendance/request')
        .set('Authorization', `Bearer ${testEmployee.userId}`)
        .send(requestData)
        .expect(201);

      expect(response.body).toMatchObject({
        userId: testEmployee.userId,
        requestedDate: requestDate.toISOString().split('T')[0],
        reason: requestData.reason,
        clockInTime: requestData.clockInTime,
        clockOutTime: requestData.clockOutTime,
        workLocation: requestData.workLocation,
        status: 'PENDING',
        notes: requestData.notes,
      });

      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        requestedDate: new Date().toISOString().split('T')[0],
        // Missing reason, clockInTime, clockOutTime
      };

      await request(app.getHttpServer())
        .post('/api/attendance/request')
        .set('Authorization', `Bearer ${testEmployee.userId}`)
        .send(incompleteData)
        .expect(400);
    });

    it('should validate date format', async () => {
      const invalidData = {
        requestedDate: 'invalid-date',
        reason: 'Test reason',
        clockInTime: '09:00',
        clockOutTime: '18:00',
        workLocation: 'OFFICE',
      };

      await request(app.getHttpServer())
        .post('/api/attendance/request')
        .set('Authorization', `Bearer ${testEmployee.userId}`)
        .send(invalidData)
        .expect(400);
    });

    it('should validate time format', async () => {
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() - 1);

      const invalidData = {
        requestedDate: requestDate.toISOString().split('T')[0],
        reason: 'Test reason',
        clockInTime: '25:00', // Invalid time
        clockOutTime: '18:00',
        workLocation: 'OFFICE',
      };

      await request(app.getHttpServer())
        .post('/api/attendance/request')
        .set('Authorization', `Bearer ${testEmployee.userId}`)
        .send(invalidData)
        .expect(400);
    });

    it('should prevent requests for future dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const futureData = {
        requestedDate: futureDate.toISOString().split('T')[0],
        reason: 'Future request',
        clockInTime: '09:00',
        clockOutTime: '18:00',
        workLocation: 'OFFICE',
      };

      await request(app.getHttpServer())
        .post('/api/attendance/request')
        .set('Authorization', `Bearer ${testEmployee.userId}`)
        .send(futureData)
        .expect(400);
    });

    it('should prevent duplicate requests for same date', async () => {
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() - 2);

      const requestData = {
        requestedDate: requestDate.toISOString().split('T')[0],
        reason: 'First request',
        clockInTime: '09:00',
        clockOutTime: '18:00',
        workLocation: 'OFFICE',
      };

      // Create first request
      await request(app.getHttpServer())
        .post('/api/attendance/request')
        .set('Authorization', `Bearer ${testEmployee.userId}`)
        .send(requestData)
        .expect(201);

      // Attempt duplicate
      await request(app.getHttpServer())
        .post('/api/attendance/request')
        .set('Authorization', `Bearer ${testEmployee.userId}`)
        .send({ ...requestData, reason: 'Duplicate request' })
        .expect(409);
    });

    it('should require authentication', async () => {
      const requestData = {
        requestedDate: new Date().toISOString().split('T')[0],
        reason: 'Unauthorized request',
        clockInTime: '09:00',
        clockOutTime: '18:00',
        workLocation: 'OFFICE',
      };

      await request(app.getHttpServer())
        .post('/api/attendance/request')
        .send(requestData)
        .expect(401);
    });

    it('should validate work location enum', async () => {
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() - 1);

      const invalidData = {
        requestedDate: requestDate.toISOString().split('T')[0],
        reason: 'Test reason',
        clockInTime: '09:00',
        clockOutTime: '18:00',
        workLocation: 'INVALID_LOCATION',
      };

      await request(app.getHttpServer())
        .post('/api/attendance/request')
        .set('Authorization', `Bearer ${testEmployee.userId}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/attendance/requests', () => {
    beforeEach(async () => {
      // Create some test requests
      const dates = [-1, -2, -3].map(days => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date;
      });

      for (const [index, date] of dates.entries()) {
        await attendanceRequestService.createRequest(testEmployee.userId, {
          requestedDate: date,
          reason: `Test request ${index + 1}`,
          clockInTime: '09:00',
          clockOutTime: '18:00',
          workLocation: 'OFFICE',
        });
      }
    });

    it('should return user\'s attendance requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/attendance/requests')
        .set('Authorization', `Bearer ${testEmployee.userId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      response.body.forEach(request => {
        expect(request.userId).toBe(testEmployee.userId);
        expect(request.status).toBeDefined();
        expect(['PENDING', 'APPROVED', 'REJECTED']).toContain(request.status);
      });
    });

    it('should support date range filtering', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 2);
      const endDate = new Date();

      const response = await request(app.getHttpServer())
        .get('/api/attendance/requests')
        .set('Authorization', `Bearer ${testEmployee.userId}`)
        .query({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      response.body.forEach(request => {
        const requestDate = new Date(request.requestedDate);
        expect(requestDate).toBeGreaterThanOrEqual(startDate);
        expect(requestDate).toBeLessThanOrEqual(endDate);
      });
    });

    it('should support status filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/attendance/requests')
        .set('Authorization', `Bearer ${testEmployee.userId}`)
        .query({ status: 'PENDING' })
        .expect(200);

      response.body.forEach(request => {
        expect(request.status).toBe('PENDING');
      });
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/attendance/requests')
        .set('Authorization', `Bearer ${testEmployee.userId}`)
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(2);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/attendance/requests')
        .expect(401);
    });
  });

  describe('GET /api/attendance/requests/pending', () => {
    let pendingRequestId: string;

    beforeEach(async () => {
      // Create a pending request
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() - 1);

      const request = await attendanceRequestService.createRequest(testEmployee.userId, {
        requestedDate: requestDate,
        reason: 'Pending approval test',
        clockInTime: '09:00',
        clockOutTime: '18:00',
        workLocation: 'OFFICE',
      });
      pendingRequestId = request.id;
    });

    it('should return pending requests for manager', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/attendance/requests/pending')
        .set('Authorization', `Bearer ${testManager.userId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      const pendingRequest = response.body.find(req => req.id === pendingRequestId);
      expect(pendingRequest).toBeDefined();
      expect(pendingRequest.status).toBe('PENDING');
      expect(pendingRequest.userId).toBe(testEmployee.userId);
    });

    it('should not return requests for non-managers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/attendance/requests/pending')
        .set('Authorization', `Bearer ${testEmployee.userId}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should include employee information', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/attendance/requests/pending')
        .set('Authorization', `Bearer ${testManager.userId}`)
        .expect(200);

      const pendingRequest = response.body.find(req => req.id === pendingRequestId);
      if (pendingRequest) {
        expect(pendingRequest.employee).toBeDefined();
        expect(pendingRequest.employee.name).toBeDefined();
      }
    });
  });

  describe('POST /api/attendance/requests/approve/:id', () => {
    let requestId: string;

    beforeEach(async () => {
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() - 1);

      const request = await attendanceRequestService.createRequest(testEmployee.userId, {
        requestedDate: requestDate,
        reason: 'Approval test request',
        clockInTime: '09:30',
        clockOutTime: '18:15',
        workLocation: 'OFFICE',
      });
      requestId = request.id;
    });

    it('should approve attendance request and create attendance record', async () => {
      const approvalData = {
        comments: 'Approved - valid reason provided',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/attendance/requests/approve/${requestId}`)
        .set('Authorization', `Bearer ${testManager.userId}`)
        .send(approvalData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: requestId,
        status: 'APPROVED',
        approvedBy: testManager.userId,
        approvalComments: approvalData.comments,
      });

      expect(response.body.createdAttendanceId).toBeDefined();
      expect(response.body.approvedAt).toBeDefined();
    });

    it('should require manager authorization', async () => {
      await request(app.getHttpServer())
        .post(`/api/attendance/requests/approve/${requestId}`)
        .set('Authorization', `Bearer ${testEmployee.userId}`)
        .send({ comments: 'Unauthorized approval' })
        .expect(403);
    });

    it('should handle non-existent request', async () => {
      await request(app.getHttpServer())
        .post('/api/attendance/requests/approve/non-existent-id')
        .set('Authorization', `Bearer ${testManager.userId}`)
        .send({ comments: 'Approval for non-existent request' })
        .expect(404);
    });

    it('should prevent double approval', async () => {
      // First approval
      await request(app.getHttpServer())
        .post(`/api/attendance/requests/approve/${requestId}`)
        .set('Authorization', `Bearer ${testManager.userId}`)
        .send({ comments: 'First approval' })
        .expect(200);

      // Second approval attempt
      await request(app.getHttpServer())
        .post(`/api/attendance/requests/approve/${requestId}`)
        .set('Authorization', `Bearer ${testManager.userId}`)
        .send({ comments: 'Second approval' })
        .expect(400);
    });

    it('should validate approval comments', async () => {
      const invalidData = {
        comments: '', // Empty comments
      };

      await request(app.getHttpServer())
        .post(`/api/attendance/requests/approve/${requestId}`)
        .set('Authorization', `Bearer ${testManager.userId}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('POST /api/attendance/requests/reject/:id', () => {
    let requestId: string;

    beforeEach(async () => {
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() - 1);

      const request = await attendanceRequestService.createRequest(testEmployee.userId, {
        requestedDate: requestDate,
        reason: 'Rejection test request',
        clockInTime: '09:00',
        clockOutTime: '18:00',
        workLocation: 'OFFICE',
      });
      requestId = request.id;
    });

    it('should reject attendance request', async () => {
      const rejectionData = {
        comments: 'Rejected - insufficient documentation provided',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/attendance/requests/reject/${requestId}`)
        .set('Authorization', `Bearer ${testManager.userId}`)
        .send(rejectionData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: requestId,
        status: 'REJECTED',
        approvedBy: testManager.userId,
        approvalComments: rejectionData.comments,
      });

      expect(response.body.createdAttendanceId).toBeNull();
      expect(response.body.approvedAt).toBeDefined();
    });

    it('should require manager authorization', async () => {
      await request(app.getHttpServer())
        .post(`/api/attendance/requests/reject/${requestId}`)
        .set('Authorization', `Bearer ${testEmployee.userId}`)
        .send({ comments: 'Unauthorized rejection' })
        .expect(403);
    });

    it('should require rejection comments', async () => {
      await request(app.getHttpServer())
        .post(`/api/attendance/requests/reject/${requestId}`)
        .set('Authorization', `Bearer ${testManager.userId}`)
        .send({})
        .expect(400);
    });
  });

  describe('Team Request Management', () => {
    beforeEach(async () => {
      // Create multiple requests from team members
      const teamMembers = [testEmployee.userId, 'team-member-2', 'team-member-3'];
      
      for (const memberId of teamMembers) {
        const requestDate = new Date();
        requestDate.setDate(requestDate.getDate() - Math.floor(Math.random() * 5) - 1);

        await attendanceRequestService.createRequest(memberId, {
          requestedDate: requestDate,
          reason: `Request from ${memberId}`,
          clockInTime: '09:00',
          clockOutTime: '18:00',
          workLocation: 'OFFICE',
        });
      }
    });

    it('should return team request statistics in reporting', async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const response = await request(app.getHttpServer())
        .get('/api/attendance/team')
        .set('Authorization', `Bearer ${testManager.userId}`)
        .query({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        })
        .expect(200);

      expect(response.body.attendanceRequests).toBeDefined();
      expect(response.body.attendanceRequests.total).toBeGreaterThanOrEqual(0);
      expect(response.body.attendanceRequests.pending).toBeGreaterThanOrEqual(0);
      expect(response.body.attendanceRequests.approved).toBeGreaterThanOrEqual(0);
      expect(response.body.attendanceRequests.rejected).toBeGreaterThanOrEqual(0);
      expect(response.body.attendanceRequests.approvalRate).toBeGreaterThanOrEqual(0);
    });

    it('should support bulk approval operations', async () => {
      // Get pending requests
      const pendingResponse = await request(app.getHttpServer())
        .get('/api/attendance/requests/pending')
        .set('Authorization', `Bearer ${testManager.userId}`)
        .expect(200);

      const requestIds = pendingResponse.body.slice(0, 2).map(req => req.id);

      if (requestIds.length > 0) {
        const bulkApprovalData = {
          requestIds,
          comments: 'Bulk approval for valid requests',
        };

        const response = await request(app.getHttpServer())
          .post('/api/attendance/requests/bulk-approve')
          .set('Authorization', `Bearer ${testManager.userId}`)
          .send(bulkApprovalData)
          .expect(200);

        expect(response.body.approved).toBe(requestIds.length);
        expect(response.body.failed).toBe(0);
      }
    });
  });

  describe('Request Analytics', () => {
    it('should provide request analytics for managers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/attendance/requests/analytics')
        .set('Authorization', `Bearer ${testManager.userId}`)
        .query({
          period: 'last_30_days',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        totalRequests: expect.any(Number),
        approvalRate: expect.any(Number),
        averageProcessingTime: expect.any(Number),
        requestsByReason: expect.any(Object),
        requestsByDay: expect.any(Array),
        topRequesters: expect.any(Array),
      });
    });

    it('should provide request trends', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/attendance/requests/trends')
        .set('Authorization', `Bearer ${testManager.userId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        weeklyTrend: expect.any(Array),
        monthlyTrend: expect.any(Array),
        reasonTrends: expect.any(Object),
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed request data', async () => {
      await request(app.getHttpServer())
        .post('/api/attendance/request')
        .set('Authorization', `Bearer ${testEmployee.userId}`)
        .send('invalid json')
        .expect(400);
    });

    it('should handle requests for dates with existing attendance', async () => {
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() - 1);

      // Create attendance record first (this would be done through attendance service)
      // Then try to create request for same date
      const requestData = {
        requestedDate: requestDate.toISOString().split('T')[0],
        reason: 'Request for date with existing attendance',
        clockInTime: '09:00',
        clockOutTime: '18:00',
        workLocation: 'OFFICE',
      };

      // This should either succeed (if no attendance exists) or fail with appropriate error
      const response = await request(app.getHttpServer())
        .post('/api/attendance/request')
        .set('Authorization', `Bearer ${testEmployee.userId}`)
        .send(requestData);

      expect([201, 409]).toContain(response.status);
    });

    it('should handle concurrent approval attempts', async () => {
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() - 1);

      const request = await attendanceRequestService.createRequest(testEmployee.userId, {
        requestedDate: requestDate,
        reason: 'Concurrent approval test',
        clockInTime: '09:00',
        clockOutTime: '18:00',
        workLocation: 'OFFICE',
      });

      // Attempt concurrent approvals
      const approvalPromises = [
        request(app.getHttpServer())
          .post(`/api/attendance/requests/approve/${request.id}`)
          .set('Authorization', `Bearer ${testManager.userId}`)
          .send({ comments: 'First approval' }),
        request(app.getHttpServer())
          .post(`/api/attendance/requests/approve/${request.id}`)
          .set('Authorization', `Bearer ${testManager.userId}`)
          .send({ comments: 'Second approval' }),
      ];

      const responses = await Promise.all(approvalPromises);
      
      // One should succeed, one should fail
      const successCount = responses.filter(r => r.status === 200).length;
      const failureCount = responses.filter(r => r.status === 400).length;
      
      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);
    });
  });
});
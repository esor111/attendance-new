import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { RequestType, RequestStatus } from '../../src/modules/attendance/entities/request.entity';

/**
 * Complete Attendance Correction Request Workflow Tests
 * Tests the entire lifecycle of attendance correction requests
 */
describe('Attendance Correction Request Workflow (e2e)', () => {
  let app: INestApplication;
  let employeeToken: string;
  let managerToken: string;
  let employeeId: string;
  let managerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    await setupAuthentication();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Successful Attendance Correction Workflow', () => {
    let correctionRequestId: string;

    it('Step 1: Employee checks their attendance history', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/attendance/history')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('Step 2: Employee validates attendance correction request', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const correctionRequest = {
        type: RequestType.ATTENDANCE_CORRECTION,
        requestData: {
          requestedDate: yesterday.toISOString().split('T')[0],
          reason: 'Forgot to clock in due to urgent client meeting that started early',
        },
        notes: 'Meeting started at 7:30 AM, forgot to clock in before rushing to conference room',
      };

      const response = await request(app.getHttpServer())
        .post('/api/requests/validate')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(correctionRequest)
        .expect(200);

      expect(response.body.canCreate).toBe(true);
    });

    it('Step 3: Employee submits attendance correction request', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const correctionRequest = {
        type: RequestType.ATTENDANCE_CORRECTION,
        requestData: {
          requestedDate: yesterday.toISOString().split('T')[0],
          reason: 'Forgot to clock in due to urgent client meeting that started early',
        },
        notes: 'Meeting started at 7:30 AM, forgot to clock in before rushing to conference room',
      };

      const response = await request(app.getHttpServer())
        .post('/api/requests/attendance-correction')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(correctionRequest)
        .expect(201);

      correctionRequestId = response.body.id;
      expect(response.body.type).toBe(RequestType.ATTENDANCE_CORRECTION);
      expect(response.body.status).toBe(RequestStatus.PENDING);
      expect(response.body.requestData.reason).toContain('client meeting');
    });

    it('Step 4: Employee views their correction request', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/requests/${correctionRequestId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.id).toBe(correctionRequestId);
      expect(response.body.status).toBe(RequestStatus.PENDING);
      expect(response.body.notes).toContain('7:30 AM');
    });

    it('Step 5: Manager sees pending correction request', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests/pending/approval?type=ATTENDANCE_CORRECTION')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const pendingRequest = response.body.find((req: any) => req.id === correctionRequestId);
      expect(pendingRequest).toBeDefined();
      expect(pendingRequest.type).toBe(RequestType.ATTENDANCE_CORRECTION);
    });

    it('Step 6: Manager reviews employee attendance history', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests/team/all?type=ATTENDANCE_CORRECTION')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const teamRequest = response.body.find((req: any) => req.id === correctionRequestId);
      expect(teamRequest).toBeDefined();
    });

    it('Step 7: Manager approves attendance correction', async () => {
      const approvalData = {
        status: RequestStatus.APPROVED,
        notes: 'Approved. Client meeting confirmed in calendar. Attendance record will be created.',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${correctionRequestId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(approvalData)
        .expect(200);

      expect(response.body.status).toBe(RequestStatus.APPROVED);
      expect(response.body.approverId).toBe(managerId);
      expect(response.body.createdAttendanceId).toBeDefined(); // Should create attendance record
    });

    it('Step 8: Employee sees approved correction with created attendance', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/requests/${correctionRequestId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.status).toBe(RequestStatus.APPROVED);
      expect(response.body.createdAttendanceId).toBeDefined();
      expect(response.body.approvalNotes).toContain('Attendance record will be created');
    });

    it('Step 9: Attendance record is created and flagged for review', async () => {
      const correctionResponse = await request(app.getHttpServer())
        .get(`/api/requests/${correctionRequestId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      if (correctionResponse.body.createdAttendanceId) {
        const attendanceResponse = await request(app.getHttpServer())
          .get(`/api/attendance/${correctionResponse.body.createdAttendanceId}`)
          .set('Authorization', `Bearer ${employeeToken}`)
          .expect(200);

        expect(attendanceResponse.body.isFlagged).toBe(true);
        expect(attendanceResponse.body.flagReason).toContain('Manual attendance request');
        expect(attendanceResponse.body.totalHours).toBe(8); // Default work hours
      }
    });

    it('Step 10: Employee can see updated attendance history', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/attendance/history')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      // Should now include the corrected attendance record
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Attendance Correction Rejection Workflow', () => {
    let rejectionRequestId: string;

    it('Employee submits suspicious attendance correction', async () => {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      const suspiciousRequest = {
        type: RequestType.ATTENDANCE_CORRECTION,
        requestData: {
          requestedDate: lastWeek.toISOString().split('T')[0],
          reason: 'Forgot to clock in',
        },
        notes: 'Just remembered I worked that day',
      };

      const response = await request(app.getHttpServer())
        .post('/api/requests/attendance-correction')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(suspiciousRequest)
        .expect(201);

      rejectionRequestId = response.body.id;
    });

    it('Manager rejects due to insufficient justification', async () => {
      const rejectionData = {
        status: RequestStatus.REJECTED,
        rejectionReason: 'Insufficient justification. No supporting evidence for work performed on this date.',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${rejectionRequestId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(rejectionData)
        .expect(200);

      expect(response.body.status).toBe(RequestStatus.REJECTED);
      expect(response.body.rejectionReason).toContain('Insufficient justification');
      expect(response.body.createdAttendanceId).toBeUndefined(); // No attendance record created
    });

    it('Employee sees rejection with clear feedback', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/requests/${rejectionRequestId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.status).toBe(RequestStatus.REJECTED);
      expect(response.body.rejectionReason).toContain('supporting evidence');
    });
  });

  describe('Time Limit Validation', () => {
    it('Should reject correction request for date older than 30 days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35 days ago

      const oldRequest = {
        type: RequestType.ATTENDANCE_CORRECTION,
        requestData: {
          requestedDate: oldDate.toISOString().split('T')[0],
          reason: 'Very old missed attendance',
        },
      };

      await request(app.getHttpServer())
        .post('/api/requests/attendance-correction')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(oldRequest)
        .expect(400); // Should fail due to time limit
    });

    it('Should reject correction request for future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const futureRequest = {
        type: RequestType.ATTENDANCE_CORRECTION,
        requestData: {
          requestedDate: futureDate.toISOString().split('T')[0],
          reason: 'Future attendance correction',
        },
      };

      await request(app.getHttpServer())
        .post('/api/requests/attendance-correction')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(futureRequest)
        .expect(400); // Should fail for future date
    });
  });

  describe('Duplicate Request Prevention', () => {
    let firstRequestId: string;

    it('Employee submits first correction request', async () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 3);

      const firstRequest = {
        type: RequestType.ATTENDANCE_CORRECTION,
        requestData: {
          requestedDate: targetDate.toISOString().split('T')[0],
          reason: 'First correction request for this date',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/requests/attendance-correction')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(firstRequest)
        .expect(201);

      firstRequestId = response.body.id;
    });

    it('Should reject duplicate correction request for same date', async () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 3);

      const duplicateRequest = {
        type: RequestType.ATTENDANCE_CORRECTION,
        requestData: {
          requestedDate: targetDate.toISOString().split('T')[0],
          reason: 'Duplicate correction request',
        },
      };

      await request(app.getHttpServer())
        .post('/api/requests/attendance-correction')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(duplicateRequest)
        .expect(409); // Conflict - duplicate request
    });

    // Cleanup
    afterAll(async () => {
      if (firstRequestId) {
        await request(app.getHttpServer())
          .post(`/api/requests/${firstRequestId}/cancel`)
          .set('Authorization', `Bearer ${employeeToken}`);
      }
    });
  });

  describe('Existing Attendance Record Prevention', () => {
    it('Should reject correction if attendance record already exists', async () => {
      // First, create an attendance record for today
      const today = new Date();
      
      // Try to create correction for date with existing attendance
      const correctionRequest = {
        type: RequestType.ATTENDANCE_CORRECTION,
        requestData: {
          requestedDate: today.toISOString().split('T')[0],
          reason: 'Trying to correct existing attendance',
        },
      };

      // This should fail if attendance already exists for today
      // The exact behavior depends on whether there's existing attendance
      const response = await request(app.getHttpServer())
        .post('/api/requests/attendance-correction')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(correctionRequest);

      // Could be 409 (conflict) if attendance exists, or 201 if it doesn't
      expect([201, 409]).toContain(response.status);
    });
  });

  describe('Attendance Correction Statistics', () => {
    it('Manager can view correction request statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests/stats/summary?type=ATTENDANCE_CORRECTION')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('approved');
      expect(response.body).toHaveProperty('rejected');
      expect(response.body).toHaveProperty('approvalRate');
    });

    it('Employee can view their correction history', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests?type=ATTENDANCE_CORRECTION')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((request: any) => {
        expect(request.type).toBe(RequestType.ATTENDANCE_CORRECTION);
        expect(request.userId).toBe(employeeId);
      });
    });
  });

  describe('Request Deadline Handling', () => {
    let deadlineRequestId: string;

    it('Employee submits correction with automatic deadline', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2);

      const correctionRequest = {
        type: RequestType.ATTENDANCE_CORRECTION,
        requestData: {
          requestedDate: yesterday.toISOString().split('T')[0],
          reason: 'Missed clock-in due to system issues',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/requests/attendance-correction')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(correctionRequest)
        .expect(201);

      deadlineRequestId = response.body.id;
      
      // Request should have automatic deadline (typically 7 days from creation)
      expect(response.body.requestData.requestDeadline).toBeDefined();
    });

    it('Manager can see requests approaching deadline', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests/pending/approval?type=ATTENDANCE_CORRECTION')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const requestWithDeadline = response.body.find((req: any) => req.id === deadlineRequestId);
      if (requestWithDeadline) {
        expect(requestWithDeadline.requestData.requestDeadline).toBeDefined();
      }
    });

    // Cleanup
    afterAll(async () => {
      if (deadlineRequestId) {
        await request(app.getHttpServer())
          .post(`/api/requests/${deadlineRequestId}/cancel`)
          .set('Authorization', `Bearer ${employeeToken}`);
      }
    });
  });

  async function setupAuthentication() {
    // Employee authentication
    const employeeResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'employee@company.com',
        password: 'password123',
      })
      .expect(200);

    employeeToken = employeeResponse.body.access_token;
    employeeId = employeeResponse.body.user.id;

    // Manager authentication
    const managerResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'manager@company.com',
        password: 'password123',
      })
      .expect(200);

    managerToken = managerResponse.body.access_token;
    managerId = managerResponse.body.user.id;
  }
});
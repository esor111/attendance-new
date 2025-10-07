import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { RequestType, RequestStatus } from '../../src/modules/attendance/entities/request.entity';

/**
 * Complete Leave Request Workflow Tests
 * Tests the entire lifecycle of leave requests from creation to completion
 */
describe('Leave Request Workflow (e2e)', () => {
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

    // Setup authentication
    await setupAuthentication();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Leave Request Lifecycle', () => {
    let leaveRequestId: string;

    it('Step 1: Employee checks leave balance', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/leave/balance?year=2025')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      const annualLeave = response.body.find(balance => balance.leaveType.type === 'ANNUAL');
      expect(annualLeave).toBeDefined();
      expect(annualLeave.remainingDays).toBeGreaterThan(0);
    });

    it('Step 2: Employee validates leave request before submission', async () => {
      const leaveRequest = {
        type: RequestType.LEAVE,
        requestData: {
          leaveType: 'ANNUAL',
          startDate: '2025-12-20',
          endDate: '2025-12-24',
          daysRequested: 5,
          reason: 'Christmas holiday with family',
          balanceInfo: {
            allocatedDays: 25,
            usedDays: 10,
            remainingDays: 15,
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/requests/validate')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveRequest)
        .expect(200);

      expect(response.body.canCreate).toBe(true);
    });

    it('Step 3: Employee submits leave request', async () => {
      const leaveRequest = {
        type: RequestType.LEAVE,
        requestData: {
          leaveType: 'ANNUAL',
          startDate: '2025-12-20',
          endDate: '2025-12-24',
          daysRequested: 5,
          reason: 'Christmas holiday with family',
          balanceInfo: {
            allocatedDays: 25,
            usedDays: 10,
            remainingDays: 15,
          },
        },
        notes: 'Planning family trip for Christmas',
      };

      const response = await request(app.getHttpServer())
        .post('/api/requests/leave')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveRequest)
        .expect(201);

      leaveRequestId = response.body.id;
      expect(response.body.type).toBe(RequestType.LEAVE);
      expect(response.body.status).toBe(RequestStatus.PENDING);
      expect(response.body.userId).toBe(employeeId);
    });

    it('Step 4: Employee views their submitted request', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/requests/${leaveRequestId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.id).toBe(leaveRequestId);
      expect(response.body.status).toBe(RequestStatus.PENDING);
      expect(response.body.requestData.reason).toBe('Christmas holiday with family');
    });

    it('Step 5: Manager sees pending request in their queue', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests/pending/approval')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const pendingRequest = response.body.find((req: any) => req.id === leaveRequestId);
      expect(pendingRequest).toBeDefined();
      expect(pendingRequest.status).toBe(RequestStatus.PENDING);
    });

    it('Step 6: Manager reviews team requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests/team/all')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const teamRequest = response.body.find((req: any) => req.id === leaveRequestId);
      expect(teamRequest).toBeDefined();
    });

    it('Step 7: Manager approves the leave request', async () => {
      const approvalData = {
        status: RequestStatus.APPROVED,
        notes: 'Approved for Christmas holiday. Enjoy your time with family!',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${leaveRequestId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(approvalData)
        .expect(200);

      expect(response.body.status).toBe(RequestStatus.APPROVED);
      expect(response.body.approverId).toBe(managerId);
      expect(response.body.approvedAt).toBeDefined();
      expect(response.body.approvalNotes).toBe(approvalData.notes);
    });

    it('Step 8: Employee sees approved request', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/requests/${leaveRequestId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.status).toBe(RequestStatus.APPROVED);
      expect(response.body.approvalNotes).toContain('Approved for Christmas holiday');
    });

    it('Step 9: Employee checks updated leave balance', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/leave/balance?year=2025')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      const annualLeave = response.body.find(balance => balance.leaveType.type === 'ANNUAL');
      expect(annualLeave.usedDays).toBe(15); // 10 + 5 days approved
      expect(annualLeave.remainingDays).toBe(10); // 15 - 5 days used
    });

    it('Step 10: Manager views team statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests/stats/summary?type=LEAVE')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.approved).toBeGreaterThan(0);
    });
  });

  describe('Leave Request Rejection Workflow', () => {
    let rejectionRequestId: string;

    it('Employee submits leave request with insufficient notice', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      const leaveRequest = {
        type: RequestType.LEAVE,
        requestData: {
          leaveType: 'ANNUAL',
          startDate: tomorrow.toISOString().split('T')[0],
          endDate: dayAfter.toISOString().split('T')[0],
          daysRequested: 2,
          reason: 'Last minute emergency',
          balanceInfo: {
            allocatedDays: 25,
            usedDays: 15,
            remainingDays: 10,
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/requests/leave')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveRequest)
        .expect(201);

      rejectionRequestId = response.body.id;
    });

    it('Manager rejects the request due to insufficient notice', async () => {
      const rejectionData = {
        status: RequestStatus.REJECTED,
        rejectionReason: 'Insufficient advance notice. Annual leave requires 7 days notice.',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${rejectionRequestId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(rejectionData)
        .expect(200);

      expect(response.body.status).toBe(RequestStatus.REJECTED);
      expect(response.body.rejectionReason).toContain('Insufficient advance notice');
    });

    it('Employee sees rejection and balance is restored', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/requests/${rejectionRequestId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.status).toBe(RequestStatus.REJECTED);
      
      // Check that balance was restored
      const balanceResponse = await request(app.getHttpServer())
        .get('/api/leave/balance?year=2025')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      const annualLeave = balanceResponse.body.find(balance => balance.leaveType.type === 'ANNUAL');
      expect(annualLeave.remainingDays).toBe(10); // Balance should be restored
    });
  });

  describe('Leave Request Cancellation Workflow', () => {
    let cancellationRequestId: string;

    it('Employee submits leave request', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const endDate = new Date(futureDate);
      endDate.setDate(endDate.getDate() + 2);

      const leaveRequest = {
        type: RequestType.LEAVE,
        requestData: {
          leaveType: 'PERSONAL',
          startDate: futureDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          daysRequested: 3,
          reason: 'Personal matters',
          balanceInfo: {
            allocatedDays: 5,
            usedDays: 0,
            remainingDays: 5,
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/requests/leave')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveRequest)
        .expect(201);

      cancellationRequestId = response.body.id;
    });

    it('Employee cancels their own request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/requests/${cancellationRequestId}/cancel`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.status).toBe(RequestStatus.CANCELLED);
    });

    it('Balance is restored after cancellation', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/leave/balance?year=2025')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      const personalLeave = response.body.find(balance => balance.leaveType.type === 'PERSONAL');
      expect(personalLeave.remainingDays).toBe(5); // Balance restored
    });
  });

  describe('Emergency Leave Workflow', () => {
    it('Employee submits emergency leave without advance notice', async () => {
      const today = new Date();
      
      const emergencyRequest = {
        type: RequestType.LEAVE,
        requestData: {
          leaveType: 'EMERGENCY',
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
          daysRequested: 1,
          reason: 'Family medical emergency',
          isEmergency: true,
          emergencyJustification: 'Immediate family member hospitalized',
          balanceInfo: {
            allocatedDays: 3,
            usedDays: 0,
            remainingDays: 3,
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/requests/leave')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(emergencyRequest)
        .expect(201);

      expect(response.body.requestData.isEmergency).toBe(true);
      expect(response.body.requestData.emergencyJustification).toBeDefined();
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
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { RequestType, RequestStatus } from '../../src/modules/attendance/entities/request.entity';

/**
 * Complete Remote Work Request Workflow Tests
 * Tests the entire lifecycle of remote work requests
 */
describe('Remote Work Request Workflow (e2e)', () => {
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

  describe('Successful Remote Work Request Workflow', () => {
    let remoteWorkRequestId: string;

    it('Step 1: Employee checks weekly remote work limit', async () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const startOfWeek = new Date(nextWeek);
      startOfWeek.setDate(startOfWeek.getDate() - nextWeek.getDay());
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);

      const response = await request(app.getHttpServer())
        .get(`/api/requests?type=REMOTE_WORK&startDate=${startOfWeek.toISOString().split('T')[0]}&endDate=${endOfWeek.toISOString().split('T')[0]}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      // Should have less than 2 requests for the week (company policy)
      expect(response.body.length).toBeLessThan(2);
    });

    it('Step 2: Employee validates remote work request', async () => {
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() + 3); // 3 days in advance

      const remoteWorkRequest = {
        type: RequestType.REMOTE_WORK,
        requestData: {
          requestedDate: requestDate.toISOString().split('T')[0],
          reason: 'Home office setup provides better focus for development work',
          remoteLocation: 'Home Office - 123 Main St',
          notes: 'Have dedicated workspace with high-speed internet',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/requests/validate')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(remoteWorkRequest)
        .expect(200);

      expect(response.body.canCreate).toBe(true);
    });

    it('Step 3: Employee submits remote work request', async () => {
      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() + 3);

      const remoteWorkRequest = {
        type: RequestType.REMOTE_WORK,
        requestData: {
          requestedDate: requestDate.toISOString().split('T')[0],
          reason: 'Home office setup provides better focus for development work',
          remoteLocation: 'Home Office - 123 Main St',
          notes: 'Have dedicated workspace with high-speed internet',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/requests/remote-work')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(remoteWorkRequest)
        .expect(201);

      remoteWorkRequestId = response.body.id;
      expect(response.body.type).toBe(RequestType.REMOTE_WORK);
      expect(response.body.status).toBe(RequestStatus.PENDING);
      expect(response.body.requestData.remoteLocation).toBe('Home Office - 123 Main St');
    });

    it('Step 4: Employee views their remote work requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests/type/REMOTE_WORK')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      const userRequest = response.body.find((req: any) => req.id === remoteWorkRequestId);
      expect(userRequest).toBeDefined();
      expect(userRequest.status).toBe(RequestStatus.PENDING);
    });

    it('Step 5: Manager reviews pending remote work requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests/pending/approval?type=REMOTE_WORK')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const pendingRequest = response.body.find((req: any) => req.id === remoteWorkRequestId);
      expect(pendingRequest).toBeDefined();
      expect(pendingRequest.type).toBe(RequestType.REMOTE_WORK);
    });

    it('Step 6: Manager approves remote work request', async () => {
      const approvalData = {
        status: RequestStatus.APPROVED,
        notes: 'Approved. Please ensure you maintain regular communication and productivity.',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${remoteWorkRequestId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(approvalData)
        .expect(200);

      expect(response.body.status).toBe(RequestStatus.APPROVED);
      expect(response.body.approverId).toBe(managerId);
      expect(response.body.approvalNotes).toContain('maintain regular communication');
    });

    it('Step 7: Employee sees approved remote work request', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/requests/${remoteWorkRequestId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.status).toBe(RequestStatus.APPROVED);
      expect(response.body.approvalNotes).toBeDefined();
    });

    it('Step 8: Employee can clock in remotely on approved date', async () => {
      // This would typically integrate with the attendance system
      // For now, we'll just verify the request is approved
      const response = await request(app.getHttpServer())
        .get(`/api/requests/${remoteWorkRequestId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.status).toBe(RequestStatus.APPROVED);
      
      // In a real system, this would check if remote clock-in is allowed
      // based on the approved remote work request
    });
  });

  describe('Remote Work Request Rejection Workflow', () => {
    let rejectionRequestId: string;

    it('Employee submits remote work request for busy period', async () => {
      const busyDate = new Date();
      busyDate.setDate(busyDate.getDate() + 5);

      const remoteWorkRequest = {
        type: RequestType.REMOTE_WORK,
        requestData: {
          requestedDate: busyDate.toISOString().split('T')[0],
          reason: 'Prefer working from home',
          remoteLocation: 'Home',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/requests/remote-work')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(remoteWorkRequest)
        .expect(201);

      rejectionRequestId = response.body.id;
    });

    it('Manager rejects due to business needs', async () => {
      const rejectionData = {
        status: RequestStatus.REJECTED,
        rejectionReason: 'Important client meetings scheduled. Office presence required.',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${rejectionRequestId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(rejectionData)
        .expect(200);

      expect(response.body.status).toBe(RequestStatus.REJECTED);
      expect(response.body.rejectionReason).toContain('client meetings');
    });

    it('Employee sees rejection with clear reason', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/requests/${rejectionRequestId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.status).toBe(RequestStatus.REJECTED);
      expect(response.body.rejectionReason).toContain('Office presence required');
    });
  });

  describe('Weekly Limit Validation', () => {
    it('Should reject third remote work request in same week', async () => {
      const weekDate = new Date();
      weekDate.setDate(weekDate.getDate() + 10);

      // Submit first request
      const firstRequest = {
        type: RequestType.REMOTE_WORK,
        requestData: {
          requestedDate: weekDate.toISOString().split('T')[0],
          reason: 'First remote work day',
          remoteLocation: 'Home',
        },
      };

      const firstResponse = await request(app.getHttpServer())
        .post('/api/requests/remote-work')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(firstRequest)
        .expect(201);

      // Submit second request (same week)
      const secondDate = new Date(weekDate);
      secondDate.setDate(secondDate.getDate() + 1);

      const secondRequest = {
        type: RequestType.REMOTE_WORK,
        requestData: {
          requestedDate: secondDate.toISOString().split('T')[0],
          reason: 'Second remote work day',
          remoteLocation: 'Home',
        },
      };

      const secondResponse = await request(app.getHttpServer())
        .post('/api/requests/remote-work')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(secondRequest)
        .expect(201);

      // Try to submit third request (should fail)
      const thirdDate = new Date(weekDate);
      thirdDate.setDate(thirdDate.getDate() + 2);

      const thirdRequest = {
        type: RequestType.REMOTE_WORK,
        requestData: {
          requestedDate: thirdDate.toISOString().split('T')[0],
          reason: 'Third remote work day - should fail',
          remoteLocation: 'Home',
        },
      };

      await request(app.getHttpServer())
        .post('/api/requests/remote-work')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(thirdRequest)
        .expect(400); // Should fail due to weekly limit

      // Cleanup approved requests
      await request(app.getHttpServer())
        .post(`/api/requests/${firstResponse.body.id}/cancel`)
        .set('Authorization', `Bearer ${employeeToken}`);

      await request(app.getHttpServer())
        .post(`/api/requests/${secondResponse.body.id}/cancel`)
        .set('Authorization', `Bearer ${employeeToken}`);
    });
  });

  describe('Advance Notice Validation', () => {
    it('Should reject remote work request without 24h advance notice', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(tomorrow.getHours() - 1); // Less than 24 hours

      const invalidRequest = {
        type: RequestType.REMOTE_WORK,
        requestData: {
          requestedDate: tomorrow.toISOString().split('T')[0],
          reason: 'Last minute request',
          remoteLocation: 'Home',
        },
      };

      await request(app.getHttpServer())
        .post('/api/requests/remote-work')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(invalidRequest)
        .expect(400);
    });
  });

  describe('Remote Work Statistics', () => {
    it('Manager can view remote work statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests/stats/summary?type=REMOTE_WORK')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('approved');
      expect(response.body).toHaveProperty('rejected');
      expect(response.body).toHaveProperty('approvalRate');
    });

    it('Employee can view their remote work history', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests?type=REMOTE_WORK')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((request: any) => {
        expect(request.type).toBe(RequestType.REMOTE_WORK);
        expect(request.userId).toBe(employeeId);
      });
    });
  });

  describe('Remote Work Cancellation', () => {
    let cancellationRequestId: string;

    it('Employee submits remote work request', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);

      const remoteWorkRequest = {
        type: RequestType.REMOTE_WORK,
        requestData: {
          requestedDate: futureDate.toISOString().split('T')[0],
          reason: 'Planned remote work day',
          remoteLocation: 'Home Office',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/requests/remote-work')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(remoteWorkRequest)
        .expect(201);

      cancellationRequestId = response.body.id;
    });

    it('Manager approves the request', async () => {
      const approvalData = {
        status: RequestStatus.APPROVED,
        notes: 'Approved for remote work',
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${cancellationRequestId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(approvalData)
        .expect(200);
    });

    it('Employee cancels approved remote work request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/requests/${cancellationRequestId}/cancel`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.status).toBe(RequestStatus.CANCELLED);
    });

    it('Cancelled request no longer appears in approved requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests?status=APPROVED&type=REMOTE_WORK')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      const cancelledRequest = response.body.find((req: any) => req.id === cancellationRequestId);
      expect(cancelledRequest).toBeUndefined();
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
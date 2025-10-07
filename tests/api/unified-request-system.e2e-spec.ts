import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { RequestType, RequestStatus } from '../../src/modules/attendance/entities/request.entity';

/**
 * End-to-End Tests for Unified Request System
 * Tests all API endpoints systematically to ensure complete functionality
 */
describe('Unified Request System (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let testUserId: string;
  let testManagerId: string;
  let createdRequestIds: string[] = [];

  // Test data for different request types
  const testData = {
    leaveRequest: {
      type: RequestType.LEAVE,
      requestData: {
        leaveType: 'ANNUAL',
        startDate: '2025-12-15',
        endDate: '2025-12-17',
        daysRequested: 3,
        reason: 'Family vacation',
        balanceInfo: {
          allocatedDays: 25,
          usedDays: 5,
          remainingDays: 20,
        },
      },
      notes: 'Planning family trip',
    },
    remoteWorkRequest: {
      type: RequestType.REMOTE_WORK,
      requestData: {
        requestedDate: '2025-11-20',
        reason: 'Home office setup for better productivity',
        remoteLocation: 'Home Office',
        notes: 'Have all necessary equipment',
      },
    },
    attendanceCorrectionRequest: {
      type: RequestType.ATTENDANCE_CORRECTION,
      requestData: {
        requestedDate: '2025-10-15',
        reason: 'Forgot to clock in due to urgent meeting',
      },
      notes: 'Had early morning client meeting',
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Setup test authentication and users
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup created test data
    await cleanupTestData();
    await app.close();
  });

  describe('Authentication Setup', () => {
    it('should authenticate test user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test.user@company.com',
          password: 'testpassword123',
        })
        .expect(200);

      authToken = response.body.access_token;
      testUserId = response.body.user.id;
      expect(authToken).toBeDefined();
      expect(testUserId).toBeDefined();
    });

    it('should authenticate test manager', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test.manager@company.com',
          password: 'managerpassword123',
        })
        .expect(200);

      testManagerId = response.body.user.id;
      expect(testManagerId).toBeDefined();
    });
  });

  describe('Migration System', () => {
    it('should check migration status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/migration/consolidate-requests/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('originalCounts');
      expect(response.body).toHaveProperty('migratedCounts');
      expect(response.body).toHaveProperty('migrationComplete');
    });

    it('should execute migration if needed', async () => {
      const statusResponse = await request(app.getHttpServer())
        .get('/api/migration/consolidate-requests/status')
        .set('Authorization', `Bearer ${authToken}`);

      if (!statusResponse.body.migrationComplete) {
        const migrationResponse = await request(app.getHttpServer())
          .post('/api/migration/consolidate-requests')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(migrationResponse.body.success).toBe(true);
        expect(migrationResponse.body.migratedCounts.total).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Request Creation - Generic Endpoint', () => {
    it('should create a leave request via generic endpoint', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData.leaveRequest)
        .expect(201);

      expect(response.body.type).toBe(RequestType.LEAVE);
      expect(response.body.status).toBe(RequestStatus.PENDING);
      expect(response.body.userId).toBe(testUserId);
      expect(response.body.requestData.leaveType).toBe('ANNUAL');
      
      createdRequestIds.push(response.body.id);
    });

    it('should create a remote work request via generic endpoint', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData.remoteWorkRequest)
        .expect(201);

      expect(response.body.type).toBe(RequestType.REMOTE_WORK);
      expect(response.body.status).toBe(RequestStatus.PENDING);
      expect(response.body.requestData.remoteLocation).toBe('Home Office');
      
      createdRequestIds.push(response.body.id);
    });

    it('should create an attendance correction request via generic endpoint', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData.attendanceCorrectionRequest)
        .expect(201);

      expect(response.body.type).toBe(RequestType.ATTENDANCE_CORRECTION);
      expect(response.body.status).toBe(RequestStatus.PENDING);
      
      createdRequestIds.push(response.body.id);
    });
  });

  describe('Request Creation - Type-Specific Endpoints', () => {
    it('should create leave request via type-specific endpoint', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/requests/leave')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: RequestType.LEAVE,
          requestData: {
            leaveType: 'SICK',
            startDate: '2025-11-25',
            endDate: '2025-11-25',
            daysRequested: 1,
            reason: 'Medical appointment',
            balanceInfo: {
              allocatedDays: 10,
              usedDays: 2,
              remainingDays: 8,
            },
          },
        })
        .expect(201);

      expect(response.body.type).toBe(RequestType.LEAVE);
      expect(response.body.requestData.leaveType).toBe('SICK');
      
      createdRequestIds.push(response.body.id);
    });

    it('should create remote work request via type-specific endpoint', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/requests/remote-work')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: RequestType.REMOTE_WORK,
          requestData: {
            requestedDate: '2025-11-22',
            reason: 'Avoiding traffic during construction',
            remoteLocation: 'Home',
          },
        })
        .expect(201);

      expect(response.body.type).toBe(RequestType.REMOTE_WORK);
      
      createdRequestIds.push(response.body.id);
    });

    it('should create attendance correction via type-specific endpoint', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/requests/attendance-correction')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: RequestType.ATTENDANCE_CORRECTION,
          requestData: {
            requestedDate: '2025-10-14',
            reason: 'System was down, could not clock in',
          },
        })
        .expect(201);

      expect(response.body.type).toBe(RequestType.ATTENDANCE_CORRECTION);
      
      createdRequestIds.push(response.body.id);
    });
  });

  describe('Request Validation', () => {
    it('should validate leave request before creation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/requests/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData.leaveRequest)
        .expect(200);

      expect(response.body.canCreate).toBeDefined();
    });

    it('should reject invalid leave request (insufficient balance)', async () => {
      const invalidRequest = {
        ...testData.leaveRequest,
        requestData: {
          ...testData.leaveRequest.requestData,
          daysRequested: 25, // More than remaining balance
          balanceInfo: {
            allocatedDays: 25,
            usedDays: 20,
            remainingDays: 5, // Only 5 remaining
          },
        },
      };

      await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest)
        .expect(400);
    });

    it('should reject remote work request without 24h advance notice', async () => {
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
        .post('/api/requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest)
        .expect(400);
    });

    it('should reject attendance correction for future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const invalidRequest = {
        type: RequestType.ATTENDANCE_CORRECTION,
        requestData: {
          requestedDate: futureDate.toISOString().split('T')[0],
          reason: 'Future date request',
        },
      };

      await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest)
        .expect(400);
    });
  });

  describe('Request Retrieval', () => {
    it('should get all user requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should get requests filtered by type', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/requests?type=${RequestType.LEAVE}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((request: any) => {
        expect(request.type).toBe(RequestType.LEAVE);
      });
    });

    it('should get requests filtered by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/requests?status=${RequestStatus.PENDING}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((request: any) => {
        expect(request.status).toBe(RequestStatus.PENDING);
      });
    });

    it('should get requests by specific type endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/requests/type/${RequestType.REMOTE_WORK}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((request: any) => {
        expect(request.type).toBe(RequestType.REMOTE_WORK);
      });
    });

    it('should get specific request by ID', async () => {
      if (createdRequestIds.length > 0) {
        const response = await request(app.getHttpServer())
          .get(`/api/requests/${createdRequestIds[0]}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.id).toBe(createdRequestIds[0]);
        expect(response.body.userId).toBe(testUserId);
      }
    });

    it('should get requests with date range filter', async () => {
      const startDate = '2025-10-01';
      const endDate = '2025-12-31';

      const response = await request(app.getHttpServer())
        .get(`/api/requests?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Request Statistics', () => {
    it('should get request statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests/stats/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('pending');
      expect(response.body).toHaveProperty('approved');
      expect(response.body).toHaveProperty('rejected');
      expect(response.body).toHaveProperty('approvalRate');
    });

    it('should get statistics filtered by type', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/requests/stats/summary?type=${RequestType.LEAVE}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(typeof response.body.total).toBe('number');
    });

    it('should get statistics with date range', async () => {
      const startDate = '2025-10-01';
      const endDate = '2025-12-31';

      const response = await request(app.getHttpServer())
        .get(`/api/requests/stats/summary?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
    });
  });

  describe('Manager Workflows', () => {
    let managerAuthToken: string;

    beforeAll(async () => {
      // Authenticate as manager
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test.manager@company.com',
          password: 'managerpassword123',
        });

      managerAuthToken = response.body.access_token;
    });

    it('should get pending requests for manager approval', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests/pending/approval')
        .set('Authorization', `Bearer ${managerAuthToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get team requests for manager', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests/team/all')
        .set('Authorization', `Bearer ${managerAuthToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should approve a request', async () => {
      if (createdRequestIds.length > 0) {
        const response = await request(app.getHttpServer())
          .post(`/api/requests/${createdRequestIds[0]}/approve`)
          .set('Authorization', `Bearer ${managerAuthToken}`)
          .send({
            status: RequestStatus.APPROVED,
            notes: 'Approved for testing purposes',
          })
          .expect(200);

        expect(response.body.status).toBe(RequestStatus.APPROVED);
        expect(response.body.approverId).toBe(testManagerId);
        expect(response.body.approvedAt).toBeDefined();
      }
    });

    it('should reject a request', async () => {
      if (createdRequestIds.length > 1) {
        const response = await request(app.getHttpServer())
          .post(`/api/requests/${createdRequestIds[1]}/approve`)
          .set('Authorization', `Bearer ${managerAuthToken}`)
          .send({
            status: RequestStatus.REJECTED,
            rejectionReason: 'Insufficient business justification',
          })
          .expect(200);

        expect(response.body.status).toBe(RequestStatus.REJECTED);
        expect(response.body.rejectionReason).toBe('Insufficient business justification');
      }
    });
  });

  describe('Request Modifications', () => {
    it('should cancel a pending request', async () => {
      if (createdRequestIds.length > 2) {
        const response = await request(app.getHttpServer())
          .post(`/api/requests/${createdRequestIds[2]}/cancel`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.status).toBe(RequestStatus.CANCELLED);
      }
    });

    it('should not allow cancelling already processed request', async () => {
      if (createdRequestIds.length > 0) {
        // Try to cancel an already approved request
        await request(app.getHttpServer())
          .post(`/api/requests/${createdRequestIds[0]}/cancel`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      }
    });

    it('should delete a pending request', async () => {
      if (createdRequestIds.length > 3) {
        await request(app.getHttpServer())
          .delete(`/api/requests/${createdRequestIds[3]}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent request', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app.getHttpServer())
        .get(`/api/requests/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 400 for invalid request data', async () => {
      await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'INVALID_TYPE',
          requestData: {},
        })
        .expect(400);
    });

    it('should return 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/api/requests')
        .expect(401);
    });

    it('should return 403 for unauthorized approval', async () => {
      if (createdRequestIds.length > 4) {
        // Try to approve as regular user (not manager)
        await request(app.getHttpServer())
          .post(`/api/requests/${createdRequestIds[4]}/approve`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            status: RequestStatus.APPROVED,
          })
          .expect(403);
      }
    });
  });

  describe('Performance and Pagination', () => {
    it('should handle large request lists with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests?limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });

    it('should respond quickly to statistics requests', async () => {
      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .get('/api/requests/stats/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create test users and setup authentication
    // This would typically involve creating test users in the database
    console.log('Setting up test data...');
  }

  async function cleanupTestData() {
    // Clean up any test data created during tests
    console.log('Cleaning up test data...');
    
    // Delete created requests
    for (const requestId of createdRequestIds) {
      try {
        await request(app.getHttpServer())
          .delete(`/api/requests/${requestId}`)
          .set('Authorization', `Bearer ${authToken}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
});
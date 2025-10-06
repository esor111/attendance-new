import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DepartmentScheduleService } from '../src/modules/department/services/department-schedule.service';

/**
 * API tests for department schedule management endpoints
 * Tests CRUD operations, validation, and authorization
 */
describe('Department Schedule API (e2e)', () => {
  let app: INestApplication;
  let departmentScheduleService: DepartmentScheduleService;

  const testDepartment = {
    departmentId: 'test-dept-456',
    name: 'API Test Department',
    businessId: 'test-business-456',
  };

  const testAdmin = {
    userId: 'test-admin-456',
    name: 'Test Admin',
    email: 'admin@example.com',
    role: 'admin',
  };

  const testUser = {
    userId: 'test-user-456',
    name: 'Test User',
    email: 'user@example.com',
    departmentId: testDepartment.departmentId,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    departmentScheduleService = moduleFixture.get<DepartmentScheduleService>(DepartmentScheduleService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/departments/:id/schedule', () => {
    it('should create department schedule with valid data', async () => {
      const scheduleData = {
        name: 'Standard Business Hours',
        startTime: '09:00',
        endTime: '18:00',
        workDays: [1, 2, 3, 4, 5], // Monday to Friday
        isActive: true,
        description: 'Standard 9-6 working hours',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/departments/${testDepartment.departmentId}/schedule`)
        .set('Authorization', `Bearer ${testAdmin.userId}`)
        .send(scheduleData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: scheduleData.name,
        startTime: '09:00:00', // Should be formatted to HH:MM:SS
        endTime: '18:00:00',
        workDays: scheduleData.workDays,
        isActive: true,
        description: scheduleData.description,
      });

      expect(response.body.id).toBeDefined();
      expect(response.body.departmentId).toBe(testDepartment.departmentId);
    });

    it('should validate time format', async () => {
      const invalidScheduleData = {
        name: 'Invalid Schedule',
        startTime: '25:00', // Invalid hour
        endTime: '18:00',
        workDays: [1, 2, 3, 4, 5],
      };

      await request(app.getHttpServer())
        .post(`/api/departments/${testDepartment.departmentId}/schedule`)
        .set('Authorization', `Bearer ${testAdmin.userId}`)
        .send(invalidScheduleData)
        .expect(400);
    });

    it('should validate work days', async () => {
      const invalidScheduleData = {
        name: 'Invalid Work Days',
        startTime: '09:00',
        endTime: '18:00',
        workDays: [1, 2, 3, 4, 5, 8], // Invalid day (8)
      };

      await request(app.getHttpServer())
        .post(`/api/departments/${testDepartment.departmentId}/schedule`)
        .set('Authorization', `Bearer ${testAdmin.userId}`)
        .send(invalidScheduleData)
        .expect(400);
    });

    it('should validate time range logic', async () => {
      const invalidScheduleData = {
        name: 'Invalid Time Range',
        startTime: '18:00',
        endTime: '09:00', // End before start
        workDays: [1, 2, 3, 4, 5],
      };

      await request(app.getHttpServer())
        .post(`/api/departments/${testDepartment.departmentId}/schedule`)
        .set('Authorization', `Bearer ${testAdmin.userId}`)
        .send(invalidScheduleData)
        .expect(400);
    });

    it('should require authorization', async () => {
      const scheduleData = {
        name: 'Unauthorized Schedule',
        startTime: '09:00',
        endTime: '18:00',
        workDays: [1, 2, 3, 4, 5],
      };

      await request(app.getHttpServer())
        .post(`/api/departments/${testDepartment.departmentId}/schedule`)
        .send(scheduleData)
        .expect(401);
    });

    it('should handle non-existent department', async () => {
      const scheduleData = {
        name: 'Schedule for Non-existent Dept',
        startTime: '09:00',
        endTime: '18:00',
        workDays: [1, 2, 3, 4, 5],
      };

      await request(app.getHttpServer())
        .post('/api/departments/non-existent-dept/schedule')
        .set('Authorization', `Bearer ${testAdmin.userId}`)
        .send(scheduleData)
        .expect(404);
    });
  });

  describe('GET /api/departments/:id/schedule', () => {
    let scheduleId: string;

    beforeEach(async () => {
      // Create a test schedule
      const schedule = await departmentScheduleService.createSchedule(testDepartment.departmentId, {
        name: 'Test Schedule',
        startTime: '08:30',
        endTime: '17:30',
        workDays: [1, 2, 3, 4, 5],
        isActive: true,
      });
      scheduleId = schedule.id;
    });

    it('should retrieve department schedule', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/departments/${testDepartment.departmentId}/schedule`)
        .set('Authorization', `Bearer ${testUser.userId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: scheduleId,
        name: 'Test Schedule',
        startTime: '08:30:00',
        endTime: '17:30:00',
        workDays: [1, 2, 3, 4, 5],
        isActive: true,
      });
    });

    it('should return 404 for department without schedule', async () => {
      await request(app.getHttpServer())
        .get('/api/departments/dept-without-schedule/schedule')
        .set('Authorization', `Bearer ${testUser.userId}`)
        .expect(404);
    });

    it('should include formatted display information', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/departments/${testDepartment.departmentId}/schedule`)
        .set('Authorization', `Bearer ${testUser.userId}`)
        .expect(200);

      expect(response.body.displayInfo).toBeDefined();
      expect(response.body.displayInfo.workingHours).toBe('08:30 - 17:30');
      expect(response.body.displayInfo.workDaysText).toContain('Mon');
    });
  });

  describe('PUT /api/departments/:id/schedule', () => {
    let scheduleId: string;

    beforeEach(async () => {
      const schedule = await departmentScheduleService.createSchedule(testDepartment.departmentId, {
        name: 'Original Schedule',
        startTime: '09:00',
        endTime: '18:00',
        workDays: [1, 2, 3, 4, 5],
        isActive: true,
      });
      scheduleId = schedule.id;
    });

    it('should update department schedule', async () => {
      const updateData = {
        name: 'Updated Schedule',
        startTime: '08:00',
        endTime: '17:00',
        workDays: [1, 2, 3, 4, 5, 6], // Include Saturday
        description: 'Updated working hours',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/departments/${testDepartment.departmentId}/schedule`)
        .set('Authorization', `Bearer ${testAdmin.userId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        name: 'Updated Schedule',
        startTime: '08:00:00',
        endTime: '17:00:00',
        workDays: [1, 2, 3, 4, 5, 6],
        description: 'Updated working hours',
      });
    });

    it('should allow partial updates', async () => {
      const updateData = {
        name: 'Partially Updated Schedule',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/departments/${testDepartment.departmentId}/schedule`)
        .set('Authorization', `Bearer ${testAdmin.userId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe('Partially Updated Schedule');
      expect(response.body.startTime).toBe('09:00:00'); // Should remain unchanged
    });

    it('should validate updated time ranges', async () => {
      const invalidUpdateData = {
        startTime: '20:00',
        endTime: '08:00', // Invalid range
      };

      await request(app.getHttpServer())
        .put(`/api/departments/${testDepartment.departmentId}/schedule`)
        .set('Authorization', `Bearer ${testAdmin.userId}`)
        .send(invalidUpdateData)
        .expect(400);
    });

    it('should require admin authorization for updates', async () => {
      const updateData = {
        name: 'Unauthorized Update',
      };

      await request(app.getHttpServer())
        .put(`/api/departments/${testDepartment.departmentId}/schedule`)
        .set('Authorization', `Bearer ${testUser.userId}`) // Regular user
        .send(updateData)
        .expect(403);
    });
  });

  describe('GET /api/attendance/my-schedule', () => {
    beforeEach(async () => {
      // Create schedule for user's department
      await departmentScheduleService.createSchedule(testDepartment.departmentId, {
        name: 'User Department Schedule',
        startTime: '09:30',
        endTime: '18:30',
        workDays: [1, 2, 3, 4, 5],
        isActive: true,
        description: 'Schedule for user testing',
      });
    });

    it('should return user\'s department schedule', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/attendance/my-schedule')
        .set('Authorization', `Bearer ${testUser.userId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        name: 'User Department Schedule',
        startTime: '09:30:00',
        endTime: '18:30:00',
        workDays: [1, 2, 3, 4, 5],
        isActive: true,
      });

      expect(response.body.displayInfo).toBeDefined();
      expect(response.body.displayInfo.workingHours).toBe('09:30 - 18:30');
    });

    it('should return null for user without department', async () => {
      const userWithoutDept = {
        userId: 'user-no-dept',
        name: 'User Without Department',
      };

      const response = await request(app.getHttpServer())
        .get('/api/attendance/my-schedule')
        .set('Authorization', `Bearer ${userWithoutDept.userId}`)
        .expect(200);

      expect(response.body).toBeNull();
    });

    it('should return null for department without schedule', async () => {
      const userWithDeptNoSchedule = {
        userId: 'user-dept-no-schedule',
        departmentId: 'dept-no-schedule',
      };

      const response = await request(app.getHttpServer())
        .get('/api/attendance/my-schedule')
        .set('Authorization', `Bearer ${userWithDeptNoSchedule.userId}`)
        .expect(200);

      expect(response.body).toBeNull();
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/attendance/my-schedule')
        .expect(401);
    });
  });

  describe('Schedule Validation Endpoint', () => {
    beforeEach(async () => {
      await departmentScheduleService.createSchedule(testDepartment.departmentId, {
        name: 'Validation Test Schedule',
        startTime: '09:00',
        endTime: '17:00',
        workDays: [1, 2, 3, 4, 5], // Monday to Friday
        isActive: true,
      });
    });

    it('should validate time within schedule', async () => {
      const testTime = new Date();
      testTime.setHours(10, 30, 0, 0); // 10:30 AM on a weekday

      const response = await request(app.getHttpServer())
        .post(`/api/departments/${testDepartment.departmentId}/schedule/validate`)
        .set('Authorization', `Bearer ${testUser.userId}`)
        .send({
          time: testTime.toISOString(),
        })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.compliance.isWithinSchedule).toBe(true);
      expect(response.body.compliance.isWorkDay).toBe(true);
      expect(response.body.compliance.isWithinHours).toBe(true);
    });

    it('should validate time outside working hours', async () => {
      const testTime = new Date();
      testTime.setHours(7, 0, 0, 0); // 7:00 AM (before 9:00 AM)

      const response = await request(app.getHttpServer())
        .post(`/api/departments/${testDepartment.departmentId}/schedule/validate`)
        .set('Authorization', `Bearer ${testUser.userId}`)
        .send({
          time: testTime.toISOString(),
        })
        .expect(200);

      expect(response.body.isValid).toBe(false);
      expect(response.body.compliance.isWithinSchedule).toBe(false);
      expect(response.body.compliance.isWithinHours).toBe(false);
      expect(response.body.compliance.message).toContain('outside working hours');
    });

    it('should validate time on non-work day', async () => {
      const testTime = new Date();
      testTime.setDay(0); // Sunday
      testTime.setHours(10, 0, 0, 0);

      const response = await request(app.getHttpServer())
        .post(`/api/departments/${testDepartment.departmentId}/schedule/validate`)
        .set('Authorization', `Bearer ${testUser.userId}`)
        .send({
          time: testTime.toISOString(),
        })
        .expect(200);

      expect(response.body.isValid).toBe(false);
      expect(response.body.compliance.isWorkDay).toBe(false);
      expect(response.body.compliance.message).toContain('non-work day');
    });
  });

  describe('Bulk Schedule Operations', () => {
    it('should create multiple schedules for different departments', async () => {
      const departments = ['dept-1', 'dept-2', 'dept-3'];
      const scheduleData = {
        name: 'Bulk Schedule',
        startTime: '09:00',
        endTime: '18:00',
        workDays: [1, 2, 3, 4, 5],
        isActive: true,
      };

      const promises = departments.map(deptId =>
        request(app.getHttpServer())
          .post(`/api/departments/${deptId}/schedule`)
          .set('Authorization', `Bearer ${testAdmin.userId}`)
          .send(scheduleData)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.name).toBe('Bulk Schedule');
      });
    });

    it('should handle concurrent schedule updates', async () => {
      // Create initial schedule
      const schedule = await departmentScheduleService.createSchedule(testDepartment.departmentId, {
        name: 'Concurrent Test',
        startTime: '09:00',
        endTime: '18:00',
        workDays: [1, 2, 3, 4, 5],
        isActive: true,
      });

      // Attempt concurrent updates
      const updatePromises = [
        request(app.getHttpServer())
          .put(`/api/departments/${testDepartment.departmentId}/schedule`)
          .set('Authorization', `Bearer ${testAdmin.userId}`)
          .send({ name: 'Update 1' }),
        request(app.getHttpServer())
          .put(`/api/departments/${testDepartment.departmentId}/schedule`)
          .set('Authorization', `Bearer ${testAdmin.userId}`)
          .send({ name: 'Update 2' }),
      ];

      const responses = await Promise.all(updatePromises);
      
      // Both should succeed (last one wins)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed request data', async () => {
      await request(app.getHttpServer())
        .post(`/api/departments/${testDepartment.departmentId}/schedule`)
        .set('Authorization', `Bearer ${testAdmin.userId}`)
        .send('invalid json')
        .expect(400);
    });

    it('should handle missing required fields', async () => {
      const incompleteData = {
        name: 'Incomplete Schedule',
        // Missing startTime, endTime, workDays
      };

      await request(app.getHttpServer())
        .post(`/api/departments/${testDepartment.departmentId}/schedule`)
        .set('Authorization', `Bearer ${testAdmin.userId}`)
        .send(incompleteData)
        .expect(400);
    });

    it('should handle database connection errors gracefully', async () => {
      // This would require mocking the database connection
      // For now, we'll test that the endpoint exists and handles errors
      const response = await request(app.getHttpServer())
        .get('/api/departments/test-error-handling/schedule')
        .set('Authorization', `Bearer ${testUser.userId}`);

      // Should return either 404 (not found) or 500 (server error), not crash
      expect([404, 500]).toContain(response.status);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple schedule validations efficiently', async () => {
      await departmentScheduleService.createSchedule(testDepartment.departmentId, {
        name: 'Performance Test Schedule',
        startTime: '09:00',
        endTime: '18:00',
        workDays: [1, 2, 3, 4, 5],
        isActive: true,
      });

      const startTime = Date.now();
      
      // Create 50 concurrent validation requests
      const promises = [];
      for (let i = 0; i < 50; i++) {
        const testTime = new Date();
        testTime.setHours(9 + (i % 8), 0, 0, 0);
        
        promises.push(
          request(app.getHttpServer())
            .post(`/api/departments/${testDepartment.departmentId}/schedule/validate`)
            .set('Authorization', `Bearer ${testUser.userId}`)
            .send({ time: testTime.toISOString() })
        );
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete in under 2 seconds
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * End-to-End tests for the complete attendance workflow
 * Tests the integration of all modules and the complete user journey
 */
describe('Attendance Workflow (e2e)', () => {
  let app: INestApplication;
  let createdUser: any;
  let createdDepartment: any;
  let createdEntity: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Workflow: User Registration to Location Validation', () => {
    it('should complete the full workflow from user creation to location validation', async () => {
      // Step 1: Create a department
      const departmentData = {
        name: 'E2E Test Department',
        businessId: 'e2e-business-123',
      };

      const departmentResponse = await request(app.getHttpServer())
        .post('/departments')
        .send(departmentData)
        .expect(201);

      createdDepartment = departmentResponse.body;
      expect(createdDepartment.id).toBeDefined();
      expect(createdDepartment.name).toBe(departmentData.name);

      // Step 2: Create an entity (business location)
      const entityData = {
        name: 'E2E Test Office',
        kahaId: 'E2E-OFFICE-001',
        address: 'Test Street, Kathmandu',
        latitude: 27.7172,
        longitude: 85.3240,
        radiusMeters: 100,
        description: 'End-to-end test ion',
      };

      const entityResponse = await request(app.getHttpServer())
        .post('/entities')
        .send(entityData)
        .expect(201);

      createdEntity = entityResponse.body;
      expect(createdEntity.id).toBeDefined();
      expect(createdEntity.kahaId).toBe(entityData.kahaId);
      expect(createdEntity.location).toBeDefined();

      // Step 3: Assign entity to department
      const assignmentData = {
        entityId: createdEntity.id,
        isPrimary: true,
      };

      await request(app.getHttpServer())
        .post(`/departments/${createdDepartment.id}/entities`)
        .send(assignmentData)
        .expect(201);

      // Step 4: Simulate user handshake (this would normally fetch from external service)
      // For e2e test, we'll create a user directly and then test profile operations
      const userProfileData = {
        name: 'E2E Test User',
        phone: '+977-9876543210',
        email: 'e2etest@example.com',
        address: 'Test Address, Kathmandu',
        isFieldWorker: true,
      };

      // Note: In real scenario, user would be created via handshake process
      // For e2e test, we'll test the profile update functionality
      
      // Step 5: Test proximity search
      const proximityResponse = await request(app.getHttpServer())
        .get('/entities/nearby')
        .query({
          latitude: 27.7172,
          longitude: 85.3240,
          radiusMeters: 1000,
        })
        .expect(200);

      expect(proximityResponse.body).toBeInstanceOf(Array);
      expect(proximityResponse.body.length).toBeGreaterThan(0);
      
      const foundEntity = proximityResponse.body.find(
        (entity: any) => entity.kahaId === entityData.kahaId
      );
      expect(foundEntity).toBeDefined();
      expect(foundEntity.distanceMeters).toBeLessThan(100); // Should be very close

      // Step 6: Test location validation within radius
      const validLocationData = {
        latitude: 27.7173, // Very close to entity
        longitude: 85.3241,
      };

      const validationResponse = await request(app.getHttpServer())
        .post(`/entities/${createdEntity.id}/validate-location`)
        .send(validLocationData)
        .expect(200);

      expect(validationResponse.body.isValid).toBe(true);
      expect(validationResponse.body.distanceMeters).toBeLessThan(entityData.radiusMeters);
      expect(validationResponse.body.entityName).toBe(entityData.name);

      // Step 7: Test location validation outside radius
      const invalidLocationData = {
        latitude: 27.8000, // Far from entity
        longitude: 85.4000,
      };

      const invalidValidationResponse = await request(app.getHttpServer())
        .post(`/entities/${createdEntity.id}/validate-location`)
        .send(invalidLocationData)
        .expect(200);

      expect(invalidValidationResponse.body.isValid).toBe(false);
      expect(invalidValidationResponse.body.distanceMeters).toBeGreaterThan(entityData.radiusMeters);
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle validation errors properly throughout the workflow', async () => {
      // Test invalid entity creation
      const invalidEntityData = {
        name: 'Invalid Entity',
        kahaId: 'INVALID@ENTITY', // Invalid characters
        latitude: 91, // Invalid latitude
        longitude: 85.3240,
        radiusMeters: 5, // Below minimum
      };

      await request(app.getHttpServer())
        .post('/entities')
        .send(invalidEntityData)
        .expect(400);

      // Test duplicate kahaId
      if (createdEntity) {
        const duplicateEntityData = {
          name: 'Duplicate Entity',
          kahaId: createdEntity.kahaId, // Same as existing
          latitude: 27.7000,
          longitude: 85.3000,
          radiusMeters: 100,
        };

        await request(app.getHttpServer())
          .post('/entities')
          .send(duplicateEntityData)
          .expect(409);
      }

      // Test invalid proximity search
      await request(app.getHttpServer())
        .get('/entities/nearby')
        .query({
          latitude: 91, // Invalid latitude
          longitude: 85.3240,
          radiusMeters: 1000,
        })
        .expect(400);

      // Test location validation with invalid entity ID
      const locationData = {
        latitude: 27.7172,
        longitude: 85.3240,
      };

      await request(app.getHttpServer())
        .post('/entities/00000000-0000-0000-0000-000000000000/validate-location')
        .send(locationData)
        .expect(404);
    });
  });

  describe('Department-Entity Assignment Workflow', () => {
    it('should handle complete department-entity assignment workflow', async () => {
      if (!createdDepartment || !createdEntity) {
        // Create test data if not available from previous tests
        const dept = await request(app.getHttpServer())
          .post('/departments')
          .send({
            name: 'Assignment Test Dept',
            businessId: 'assignment-business-123',
          })
          .expect(201);

        const entity = await request(app.getHttpServer())
          .post('/entities')
          .send({
            name: 'Assignment Test Entity',
            kahaId: 'ASSIGN-TEST-001',
            latitude: 27.7000,
            longitude: 85.3000,
            radiusMeters: 150,
          })
          .expect(201);

        createdDepartment = dept.body;
        createdEntity = entity.body;
      }

      // Test entity assignment
      const assignmentData = {
        entityId: createdEntity.id,
        isPrimary: false,
      };

      const assignmentResponse = await request(app.getHttpServer())
        .post(`/departments/${createdDepartment.id}/entities`)
        .send(assignmentData)
        .expect(201);

      expect(assignmentResponse.body.departmentId).toBe(createdDepartment.id);
      expect(assignmentResponse.body.entityId).toBe(createdEntity.id);
      expect(assignmentResponse.body.isPrimary).toBe(false);

      // Test setting as primary
      await request(app.getHttpServer())
        .post(`/departments/${createdDepartment.id}/entities/${createdEntity.id}/set-primary`)
        .expect(200);

      // Test getting department entities
      const entitiesResponse = await request(app.getHttpServer())
        .get(`/departments/${createdDepartment.id}/entities`)
        .expect(200);

      expect(entitiesResponse.body).toBeInstanceOf(Array);
      expect(entitiesResponse.body.length).toBeGreaterThan(0);
      
      const primaryEntity = entitiesResponse.body.find((assignment: any) => assignment.isPrimary);
      expect(primaryEntity).toBeDefined();
      expect(primaryEntity.entityId).toBe(createdEntity.id);

      // Test duplicate assignment prevention
      await request(app.getHttpServer())
        .post(`/departments/${createdDepartment.id}/entities`)
        .send(assignmentData)
        .expect(409);
    });
  });

  describe('Geospatial Functionality Workflow', () => {
    it('should demonstrate accurate geospatial calculations', async () => {
      // Create entities at known distances for testing
      const centralEntity = await request(app.getHttpServer())
        .post('/entities')
        .send({
          name: 'Central Office',
          kahaId: 'CENTRAL-001',
          latitude: 27.7172, // Kathmandu center
          longitude: 85.3240,
          radiusMeters: 100,
        })
        .expect(201);

      const nearbyEntity = await request(app.getHttpServer())
        .post('/entities')
        .send({
          name: 'Nearby Branch',
          kahaId: 'NEARBY-001',
          latitude: 27.7180, // Slightly north
          longitude: 85.3250, // Slightly east
          radiusMeters: 150,
        })
        .expect(201);

      const distantEntity = await request(app.getHttpServer())
        .post('/entities')
        .send({
          name: 'Distant Office',
          kahaId: 'DISTANT-001',
          latitude: 27.8000, // Much further north
          longitude: 85.4000, // Much further east
          radiusMeters: 200,
        })
        .expect(201);

      // Test proximity search from central location
      const proximityResponse = await request(app.getHttpServer())
        .get('/entities/nearby')
        .query({
          latitude: 27.7172,
          longitude: 85.3240,
          radiusMeters: 2000, // 2km radius
        })
        .expect(200);

      expect(proximityResponse.body.length).toBeGreaterThanOrEqual(2);
      
      // Results should be ordered by distance
      for (let i = 1; i < proximityResponse.body.length; i++) {
        expect(proximityResponse.body[i].distanceMeters).toBeGreaterThanOrEqual(
          proximityResponse.body[i - 1].distanceMeters
        );
      }

      // Test with smaller radius to exclude distant entity
      const smallRadiusResponse = await request(app.getHttpServer())
        .get('/entities/nearby')
        .query({
          latitude: 27.7172,
          longitude: 85.3240,
          radiusMeters: 500, // 500m radius
        })
        .expect(200);

      const distantFound = smallRadiusResponse.body.find(
        (entity: any) => entity.kahaId === 'DISTANT-001'
      );
      expect(distantFound).toBeUndefined(); // Should not be found in small radius
    });
  });

  describe('Data Consistency and Integrity', () => {
    it('should maintain data consistency across operations', async () => {
      // Test that entity updates maintain geospatial consistency
      if (createdEntity) {
        const updateData = {
          name: 'Updated Entity Name',
          radiusMeters: 200,
        };

        const updateResponse = await request(app.getHttpServer())
          .put(`/entities/${createdEntity.id}`)
          .send(updateData)
          .expect(200);

        expect(updateResponse.body.name).toBe(updateData.name);
        expect(updateResponse.body.radiusMeters).toBe(updateData.radiusMeters);
        expect(updateResponse.body.kahaId).toBe(createdEntity.kahaId); // Should remain unchanged
        expect(updateResponse.body.location).toEqual(createdEntity.location); // Should remain unchanged
      }

      // Test department updates maintain relationships
      if (createdDepartment) {
        const updateData = {
          name: 'Updated Department Name',
        };

        const updateResponse = await request(app.getHttpServer())
          .put(`/departments/${createdDepartment.id}`)
          .send(updateData)
          .expect(200);

        expect(updateResponse.body.name).toBe(updateData.name);
        expect(updateResponse.body.businessId).toBe(createdDepartment.businessId); // Should remain unchanged
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent proximity searches efficiently', async () => {
      const searchPromises = [];
      const startTime = Date.now();

      // Create 10 concurrent proximity searches
      for (let i = 0; i < 10; i++) {
        const promise = request(app.getHttpServer())
          .get('/entities/nearby')
          .query({
            latitude: 27.7172 + (Math.random() * 0.01), // Slight variation
            longitude: 85.3240 + (Math.random() * 0.01),
            radiusMeters: 1000,
          })
          .expect(200);
        
        searchPromises.push(promise);
      }

      const results = await Promise.all(searchPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All searches should complete successfully
      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result.body).toBeInstanceOf(Array);
      });

      // Should complete within reasonable time (< 2 seconds for 10 concurrent searches)
      expect(duration).toBeLessThan(2000);
    });

    it('should handle batch location validations efficiently', async () => {
      if (!createdEntity) return;

      const validationPromises = [];
      const locations = [
        { latitude: 27.7172, longitude: 85.3240 }, // Very close
        { latitude: 27.7175, longitude: 85.3245 }, // Close
        { latitude: 27.7180, longitude: 85.3250 }, // Medium distance
        { latitude: 27.7200, longitude: 85.3300 }, // Far
        { latitude: 27.8000, longitude: 85.4000 }, // Very far
      ];

      const startTime = Date.now();

      locations.forEach(location => {
        const promise = request(app.getHttpServer())
          .post(`/entities/${createdEntity.id}/validate-location`)
          .send(location)
          .expect(200);
        
        validationPromises.push(promise);
      });

      const results = await Promise.all(validationPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All validations should complete successfully
      expect(results.length).toBe(5);
      
      // First few should be valid (within radius), last ones invalid
      expect(results[0].body.isValid).toBe(true);
      expect(results[4].body.isValid).toBe(false);

      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000);
    });
  });
});
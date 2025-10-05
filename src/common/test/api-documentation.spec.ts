import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { UserController } from '../../modules/user/user.controller';
import { EntityController } from '../../modules/entity/entity.controller';
import { DepartmentController } from '../../modules/department/department.controller';
import { UserService } from '../../modules/user/user.service';
import { EntityService } from '../../modules/entity/entity.service';
import { DepartmentService } from '../../modules/department/department.service';

/**
 * API Documentation Tests
 * Ensures all controllers have proper Swagger/OpenAPI documentation
 * Validates that API endpoints are properly documented with examples
 */
describe('API Documentation Tests', () => {
  let app: INestApplication;
  let swaggerDocument: any;

  // Mock services for testing
  const mockUserService = {
    getUserByExternalId: jest.fn(),
    findByExternalUserId: jest.fn(),
    findByIdWithDepartment: jest.fn(),
    updateProfile: jest.fn(),
    getUserAccessibleEntities: jest.fn(),
    checkEntityAccess: jest.fn(),
    getUserAccessStatus: jest.fn(),
  };

  const mockEntityService = {
    create: jest.fn(),
    findNearby: jest.fn(),
    validateLocationWithinRadius: jest.fn(),
    findAllWithSummary: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByKahaId: jest.fn(),
  };

  const mockDepartmentService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByIdWithDetails: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    assignEntityToDepartment: jest.fn(),
    setPrimaryEntity: jest.fn(),
    getDepartmentEntities: jest.fn(),
    removeEntityAssignment: jest.fn(),
    getDepartmentWithEntities: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UserController, EntityController, DepartmentController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: EntityService, useValue: mockEntityService },
        { provide: DepartmentService, useValue: mockDepartmentService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Setup Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('Attendance Microservice API')
      .setDescription('REST API for attendance management with geospatial functionality')
      .setVersion('1.0')
      .addTag('users', 'User management and profile operations')
      .addTag('entities', 'Business location management with geospatial features')
      .addTag('departments', 'Department management and entity assignments')
      .build();

    swaggerDocument = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, swaggerDocument);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Swagger Document Structure', () => {
    it('should have proper API metadata', () => {
      expect(swaggerDocument.info).toBeDefined();
      expect(swaggerDocument.info.title).toBe('Attendance Microservice API');
      expect(swaggerDocument.info.description).toContain('REST API for attendance management');
      expect(swaggerDocument.info.version).toBe('1.0');
    });

    it('should have all required tags', () => {
      expect(swaggerDocument.tags).toBeDefined();
      const tagNames = swaggerDocument.tags.map((tag: any) => tag.name);
      expect(tagNames).toContain('users');
      expect(tagNames).toContain('entities');
      expect(tagNames).toContain('departments');
    });

    it('should have paths defined for all controllers', () => {
      expect(swaggerDocument.paths).toBeDefined();
      
      // Check for key endpoints
      const paths = Object.keys(swaggerDocument.paths);
      expect(paths.some(path => path.includes('/users'))).toBe(true);
      expect(paths.some(path => path.includes('/entities'))).toBe(true);
      expect(paths.some(path => path.includes('/departments'))).toBe(true);
    });
  });

  describe('User Controller Documentation', () => {
    it('should document user profile endpoints', () => {
      const userProfilePath = swaggerDocument.paths['/users/{id}/profile'];
      expect(userProfilePath).toBeDefined();
      
      // Check GET endpoint
      expect(userProfilePath.get).toBeDefined();
      expect(userProfilePath.get.summary).toContain('Get user profile');
      expect(userProfilePath.get.parameters).toBeDefined();
      expect(userProfilePath.get.responses).toBeDefined();
      expect(userProfilePath.get.responses['200']).toBeDefined();
      expect(userProfilePath.get.responses['404']).toBeDefined();
      
      // Check PUT endpoint
      expect(userProfilePath.put).toBeDefined();
      expect(userProfilePath.put.summary).toContain('Update user profile');
      expect(userProfilePath.put.requestBody).toBeDefined();
      expect(userProfilePath.put.responses['200']).toBeDefined();
      expect(userProfilePath.put.responses['400']).toBeDefined();
      expect(userProfilePath.put.responses['409']).toBeDefined();
    });

    it('should document handshake process endpoint', () => {
      const handshakePath = swaggerDocument.paths['/users/external/{userId}'];
      expect(handshakePath).toBeDefined();
      expect(handshakePath.get).toBeDefined();
      expect(handshakePath.get.summary).toContain('handshake');
      expect(handshakePath.get.description).toContain('external service');
    });

    it('should document user access control endpoints', () => {
      const accessibleEntitiesPath = swaggerDocument.paths['/users/{id}/accessible-entities'];
      expect(accessibleEntitiesPath).toBeDefined();
      
      const entityAccessPath = swaggerDocument.paths['/users/{id}/entities/{entityId}/access'];
      expect(entityAccessPath).toBeDefined();
      
      const accessStatusPath = swaggerDocument.paths['/users/{id}/access-status'];
      expect(accessStatusPath).toBeDefined();
    });
  });

  describe('Entity Controller Documentation', () => {
    it('should document entity creation with geospatial validation', () => {
      const entitiesPath = swaggerDocument.paths['/entities'];
      expect(entitiesPath).toBeDefined();
      expect(entitiesPath.post).toBeDefined();
      
      const postEndpoint = entitiesPath.post;
      expect(postEndpoint.summary).toContain('business location');
      expect(postEndpoint.description).toContain('geospatial coordinates');
      expect(postEndpoint.requestBody).toBeDefined();
      expect(postEndpoint.responses['201']).toBeDefined();
      expect(postEndpoint.responses['400']).toBeDefined();
      expect(postEndpoint.responses['409']).toBeDefined();
    });

    it('should document proximity search endpoint', () => {
      const nearbyPath = swaggerDocument.paths['/entities/nearby'];
      expect(nearbyPath).toBeDefined();
      expect(nearbyPath.get).toBeDefined();
      
      const getEndpoint = nearbyPath.get;
      expect(getEndpoint.summary).toContain('nearby entities');
      expect(getEndpoint.description).toContain('PostGIS spatial queries');
      expect(getEndpoint.parameters).toBeDefined();
      
      // Check for required query parameters
      const paramNames = getEndpoint.parameters.map((param: any) => param.name);
      expect(paramNames).toContain('latitude');
      expect(paramNames).toContain('longitude');
      expect(paramNames).toContain('radiusMeters');
    });

    it('should document location validation endpoint', () => {
      const validationPath = swaggerDocument.paths['/entities/{id}/validate-location'];
      expect(validationPath).toBeDefined();
      expect(validationPath.post).toBeDefined();
      
      const postEndpoint = validationPath.post;
      expect(postEndpoint.summary).toContain('location within entity radius');
      expect(postEndpoint.description).toContain('check-in radius');
      expect(postEndpoint.requestBody).toBeDefined();
      expect(postEndpoint.responses['200']).toBeDefined();
      expect(postEndpoint.responses['400']).toBeDefined();
      expect(postEndpoint.responses['404']).toBeDefined();
    });
  });

  describe('Department Controller Documentation', () => {
    it('should document department CRUD operations', () => {
      const departmentsPath = swaggerDocument.paths['/departments'];
      expect(departmentsPath).toBeDefined();
      
      // POST - Create department
      expect(departmentsPath.post).toBeDefined();
      expect(departmentsPath.post.summary).toContain('Create new department');
      expect(departmentsPath.post.requestBody).toBeDefined();
      
      // GET - List departments
      expect(departmentsPath.get).toBeDefined();
      expect(departmentsPath.get.parameters).toBeDefined();
    });

    it('should document entity assignment operations', () => {
      const assignmentPath = swaggerDocument.paths['/departments/{departmentId}/entities'];
      expect(assignmentPath).toBeDefined();
      
      // POST - Assign entity
      expect(assignmentPath.post).toBeDefined();
      expect(assignmentPath.post.summary).toContain('Assign entity to department');
      expect(assignmentPath.post.description).toContain('primary designation');
      
      // GET - Get department entities
      expect(assignmentPath.get).toBeDefined();
    });

    it('should document primary entity management', () => {
      const primaryPath = swaggerDocument.paths['/departments/{departmentId}/entities/{entityId}/set-primary'];
      expect(primaryPath).toBeDefined();
      expect(primaryPath.post).toBeDefined();
    });
  });

  describe('Response Schema Documentation', () => {
    it('should have proper response schemas defined', () => {
      expect(swaggerDocument.components).toBeDefined();
      expect(swaggerDocument.components.schemas).toBeDefined();
      
      // Check for key DTOs in schemas
      const schemaNames = Object.keys(swaggerDocument.components.schemas);
      expect(schemaNames.length).toBeGreaterThan(0);
    });

    it('should document error response formats', () => {
      // Check that error responses are documented across endpoints
      const paths = swaggerDocument.paths;
      let hasErrorDocumentation = false;
      
      Object.values(paths).forEach((pathItem: any) => {
        Object.values(pathItem).forEach((operation: any) => {
          if (operation.responses && (operation.responses['400'] || operation.responses['404'] || operation.responses['409'])) {
            hasErrorDocumentation = true;
          }
        });
      });
      
      expect(hasErrorDocumentation).toBe(true);
    });
  });

  describe('Parameter Documentation', () => {
    it('should document path parameters with examples', () => {
      const userProfilePath = swaggerDocument.paths['/users/{id}/profile'];
      const getOperation = userProfilePath.get;
      
      expect(getOperation.parameters).toBeDefined();
      const idParam = getOperation.parameters.find((param: any) => param.name === 'id');
      expect(idParam).toBeDefined();
      expect(idParam.schema.type).toBe('string');
      expect(idParam.schema.format).toBe('uuid');
    });

    it('should document query parameters for search endpoints', () => {
      const nearbyPath = swaggerDocument.paths['/entities/nearby'];
      const getOperation = nearbyPath.get;
      
      expect(getOperation.parameters).toBeDefined();
      expect(getOperation.parameters.length).toBeGreaterThanOrEqual(3);
      
      const latParam = getOperation.parameters.find((param: any) => param.name === 'latitude');
      expect(latParam).toBeDefined();
      expect(latParam.schema.type).toBe('number');
      expect(latParam.example).toBeDefined();
    });
  });

  describe('Request Body Documentation', () => {
    it('should document request bodies with proper schemas', () => {
      const entitiesPath = swaggerDocument.paths['/entities'];
      const postOperation = entitiesPath.post;
      
      expect(postOperation.requestBody).toBeDefined();
      expect(postOperation.requestBody.content).toBeDefined();
      expect(postOperation.requestBody.content['application/json']).toBeDefined();
      expect(postOperation.requestBody.content['application/json'].schema).toBeDefined();
    });

    it('should include validation requirements in documentation', () => {
      // This test ensures that validation decorators are reflected in the documentation
      const entitiesPath = swaggerDocument.paths['/entities'];
      const postOperation = entitiesPath.post;
      
      expect(postOperation.requestBody.required).toBe(true);
      expect(postOperation.responses['400']).toBeDefined();
      expect(postOperation.responses['400'].description).toContain('Validation failed');
    });
  });

  describe('API Consistency', () => {
    it('should use consistent response status codes', () => {
      const paths = swaggerDocument.paths;
      let postOperations = 0;
      let getOperations = 0;
      let putOperations = 0;
      let deleteOperations = 0;
      
      Object.values(paths).forEach((pathItem: any) => {
        if (pathItem.post) {
          postOperations++;
          expect(pathItem.post.responses['201'] || pathItem.post.responses['200']).toBeDefined();
        }
        if (pathItem.get) {
          getOperations++;
          expect(pathItem.get.responses['200']).toBeDefined();
        }
        if (pathItem.put) {
          putOperations++;
          expect(pathItem.put.responses['200']).toBeDefined();
        }
        if (pathItem.delete) {
          deleteOperations++;
          expect(pathItem.delete.responses['204'] || pathItem.delete.responses['200']).toBeDefined();
        }
      });
      
      expect(postOperations).toBeGreaterThan(0);
      expect(getOperations).toBeGreaterThan(0);
    });

    it('should have consistent error response documentation', () => {
      const paths = swaggerDocument.paths;
      let endpointsWithErrorDocs = 0;
      let totalEndpoints = 0;
      
      Object.values(paths).forEach((pathItem: any) => {
        Object.values(pathItem).forEach((operation: any) => {
          if (operation.responses) {
            totalEndpoints++;
            if (operation.responses['400'] || operation.responses['404'] || operation.responses['409']) {
              endpointsWithErrorDocs++;
            }
          }
        });
      });
      
      // At least 80% of endpoints should have error documentation
      const errorDocPercentage = (endpointsWithErrorDocs / totalEndpoints) * 100;
      expect(errorDocPercentage).toBeGreaterThanOrEqual(80);
    });
  });
});
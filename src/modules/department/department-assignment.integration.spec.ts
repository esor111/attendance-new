import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DepartmentService } from './department.service';
import { Department } from './entities/department.entity';
import { DepartmentEntityAssignment } from './entities/department-entity-assignment.entity';
import { Entity } from '../entity/entities/entity.entity';
import { User } from '../user/entities/user.entity';
import { BaseEntity } from '../../common/entities/base.entity';

describe('Department Assignment System Integration', () => {
  let module: TestingModule;
  let service: DepartmentService;
  let dataSource: DataSource;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [BaseEntity, Department, DepartmentEntityAssignment, Entity, User],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([Department, DepartmentEntityAssignment, Entity]),
      ],
      providers: [DepartmentService],
    }).compile();

    service = module.get<DepartmentService>(DepartmentService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await dataSource.query('DELETE FROM department_entity_assignments');
    await dataSource.query('DELETE FROM departments');
    await dataSource.query('DELETE FROM entities');
    await dataSource.query('DELETE FROM users');
  });

  describe('Department-Entity Assignment Workflow', () => {
    it('should complete full assignment workflow with primary entity logic', async () => {
      // Step 1: Create test data
      const department = await dataSource.getRepository(Department).save({
        name: 'Engineering',
        businessId: 'business-uuid-1',
      });

      const entity1 = await dataSource.getRepository(Entity).save({
        name: 'Main Office',
        kahaId: 'KAHA001',
        geohash: 'abc123',
        location: { type: 'Point', coordinates: [85.3240, 27.7172] },
        radiusMeters: 100,
      });

      const entity2 = await dataSource.getRepository(Entity).save({
        name: 'Branch Office',
        kahaId: 'KAHA002',
        geohash: 'def456',
        location: { type: 'Point', coordinates: [85.3250, 27.7180] },
        radiusMeters: 150,
      });

      // Step 2: Assign first entity (non-primary)
      const assignment1 = await service.assignEntityToDepartment(
        department.id,
        entity1.id,
        false,
      );

      expect(assignment1.departmentId).toBe(department.id);
      expect(assignment1.entityId).toBe(entity1.id);
      expect(assignment1.isPrimary).toBe(false);

      // Step 3: Assign second entity as primary
      const assignment2 = await service.assignEntityToDepartment(
        department.id,
        entity2.id,
        true,
      );

      expect(assignment2.isPrimary).toBe(true);

      // Step 4: Verify department entities
      const departmentEntities = await service.getDepartmentEntities(department.id);
      expect(departmentEntities).toHaveLength(2);
      
      // Primary entity should be first in the list
      expect(departmentEntities[0].isPrimary).toBe(true);
      expect(departmentEntities[0].entityId).toBe(entity2.id);
      expect(departmentEntities[1].isPrimary).toBe(false);
      expect(departmentEntities[1].entityId).toBe(entity1.id);

      // Step 5: Change primary entity
      await service.setPrimaryEntity(department.id, entity1.id);

      // Verify primary entity changed
      const updatedEntities = await service.getDepartmentEntities(department.id);
      const primaryEntity = updatedEntities.find(e => e.isPrimary);
      const nonPrimaryEntity = updatedEntities.find(e => !e.isPrimary);

      expect(primaryEntity?.entityId).toBe(entity1.id);
      expect(nonPrimaryEntity?.entityId).toBe(entity2.id);

      // Step 6: Test user access (create a user first)
      const userRepo = dataSource.getRepository(User);
      const user = userRepo.create({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        departmentId: department.id,
      });
      const savedUser = await userRepo.save(user);

      // Test user access to entities
      const hasAccess1 = await service.hasUserAccessToEntity(savedUser.id, entity1.id);
      const hasAccess2 = await service.hasUserAccessToEntity(savedUser.id, entity2.id);
      const hasAccessInvalid = await service.hasUserAccessToEntity(savedUser.id, 'invalid-entity-id');

      expect(hasAccess1).toBe(true);
      expect(hasAccess2).toBe(true);
      expect(hasAccessInvalid).toBe(false);

      // Test user access validation
      const accessStatus = await service.validateUserDepartmentAccess(savedUser.id);
      expect(accessStatus.hasDepartment).toBe(true);
      expect(accessStatus.hasEntities).toBe(true);

      // Step 7: Remove an assignment
      await service.removeEntityAssignment(department.id, entity2.id);

      const finalEntities = await service.getDepartmentEntities(department.id);
      expect(finalEntities).toHaveLength(1);
      expect(finalEntities[0].entityId).toBe(entity1.id);
    });

    it('should handle user without department correctly', async () => {
      // Create user without department
      const userRepo = dataSource.getRepository(User);
      const user = userRepo.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1234567891',
        departmentId: undefined,
      });
      const savedUser = await userRepo.save(user);

      // Test access validation
      const accessStatus = await service.validateUserDepartmentAccess(savedUser.id);
      expect(accessStatus.hasDepartment).toBe(false);
      expect(accessStatus.hasEntities).toBe(false);

      // Test entity access
      const hasAccess = await service.hasUserAccessToEntity(savedUser.id, 'any-entity-id');
      expect(hasAccess).toBe(false);
    });

    it('should prevent duplicate assignments', async () => {
      // Create test data
      const department = await dataSource.getRepository(Department).save({
        name: 'Sales',
        businessId: 'business-uuid-2',
      });

      const entity = await dataSource.getRepository(Entity).save({
        name: 'Sales Office',
        kahaId: 'KAHA003',
        geohash: 'ghi789',
        location: { type: 'Point', coordinates: [85.3260, 27.7190] },
        radiusMeters: 200,
      });

      // First assignment should succeed
      await service.assignEntityToDepartment(department.id, entity.id, false);

      // Second assignment should fail
      await expect(
        service.assignEntityToDepartment(department.id, entity.id, false),
      ).rejects.toThrow('Entity');
    });
  });
});
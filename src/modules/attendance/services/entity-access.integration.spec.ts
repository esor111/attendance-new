import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EntityAccessService } from './entity-access.service';
import { UserEntityAssignmentRepository } from '../repositories/user-entity-assignment.repository';
import { User } from '../../user/entities/user.entity';
import { Entity } from '../../entity/entities/entity.entity';
import { DepartmentEntityAssignment } from '../../department/entities/department-entity-assignment.entity';
import { UserEntityAssignment } from '../entities/user-entity-assignment.entity';
import { Department } from '../../department/entities/department.entity';

describe('EntityAccessService Integration Tests', () => {
  let service: EntityAccessService;
  let module: TestingModule;
  let dataSource: DataSource;

  const testDbConfig = {
    type: 'sqlite' as const,
    database: ':memory:',
    entities: [User, Entity, Department, DepartmentEntityAssignment, UserEntityAssignment],
    synchronize: true,
    logging: false,
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [TypeOrmModule.forRoot(testDbConfig), TypeOrmModule.forFeature([User, Entity, DepartmentEntityAssignment, UserEntityAssignment])],
      providers: [EntityAccessService, UserEntityAssignmentRepository],
    }).compile();

    service = module.get<EntityAccessService>(EntityAccessService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    // Clean up data before each test
    await dataSource.query('DELETE FROM user_entity_assignments');
    await dataSource.query('DELETE FROM department_entity_assignments');
    await dataSource.query('DELETE FROM entities');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM departments');
  });

  describe('Entity Access Resolution', () => {
    it('should resolve user-specific entity assignments', async () => {
      // Arrange - Create test data
      const user = await dataSource.getRepository(User).save({
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        isFieldWorker: false,
      });

      const entity = await dataSource.getRepository(Entity).save({
        name: 'Test Entity',
        kahaId: 'TEST001',
        geohash: 'test123',
        address: 'Test Address',
        location: { type: 'Point', coordinates: [85.3240, 27.7172] },
        radiusMeters: 100,
        avatarUrl: 'test-avatar.jpg',
        coverImageUrl: 'test-cover.jpg',
        description: 'Test Description',
      });

      await dataSource.getRepository(UserEntityAssignment).save({
        userId: user.id,
        entityId: entity.id,
        isPrimary: true,
      });

      // Act
      const authorizedEntities = await service.getAuthorizedEntities(user.id);

      // Assert
      expect(authorizedEntities).toHaveLength(1);
      expect(authorizedEntities[0].id).toBe(entity.id);
      expect(authorizedEntities[0].name).toBe('Test Entity');
    });

    it('should check entity access correctly', async () => {
      // Arrange
      const user = await dataSource.getRepository(User).save({
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        isFieldWorker: false,
      });

      const entity = await dataSource.getRepository(Entity).save({
        name: 'Test Entity',
        kahaId: 'TEST001',
        geohash: 'test123',
        address: 'Test Address',
        location: { type: 'Point', coordinates: [85.3240, 27.7172] },
        radiusMeters: 100,
        avatarUrl: 'test-avatar.jpg',
        coverImageUrl: 'test-cover.jpg',
        description: 'Test Description',
      });

      await dataSource.getRepository(UserEntityAssignment).save({
        userId: user.id,
        entityId: entity.id,
        isPrimary: false,
      });

      // Act
      const hasAccess = await service.hasEntityAccess(user.id, entity.id);
      const noAccess = await service.hasEntityAccess(user.id, 'non-existent-id');

      // Assert
      expect(hasAccess).toBe(true);
      expect(noAccess).toBe(false);
    });

    it('should manage primary entity designation', async () => {
      // Arrange
      const user = await dataSource.getRepository(User).save({
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        isFieldWorker: false,
      });

      const entity1 = await dataSource.getRepository(Entity).save({
        name: 'Entity 1',
        kahaId: 'TEST001',
        geohash: 'test123',
        address: 'Test Address 1',
        location: { type: 'Point', coordinates: [85.3240, 27.7172] },
        radiusMeters: 100,
        avatarUrl: 'test-avatar.jpg',
        coverImageUrl: 'test-cover.jpg',
        description: 'Test Description',
      });

      const entity2 = await dataSource.getRepository(Entity).save({
        name: 'Entity 2',
        kahaId: 'TEST002',
        geohash: 'test456',
        address: 'Test Address 2',
        location: { type: 'Point', coordinates: [85.3250, 27.7180] },
        radiusMeters: 100,
        avatarUrl: 'test-avatar.jpg',
        coverImageUrl: 'test-cover.jpg',
        description: 'Test Description',
      });

      // Create assignments
      await service.createUserEntityAssignment(user.id, entity1.id, true);
      await service.createUserEntityAssignment(user.id, entity2.id, false);

      // Act - Set entity2 as primary
      await service.setPrimaryEntity(user.id, entity2.id);

      // Assert
      const primaryEntity = await service.getPrimaryEntity(user.id);
      expect(primaryEntity?.id).toBe(entity2.id);
      expect(primaryEntity?.name).toBe('Entity 2');

      // Verify only one primary exists
      const assignments = await dataSource.getRepository(UserEntityAssignment).find({
        where: { userId: user.id },
      });
      const primaryAssignments = assignments.filter(a => a.isPrimary);
      expect(primaryAssignments).toHaveLength(1);
      expect(primaryAssignments[0].entityId).toBe(entity2.id);
    });

    it('should create and manage user entity assignments', async () => {
      // Arrange
      const user = await dataSource.getRepository(User).save({
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        isFieldWorker: false,
      });

      const entity = await dataSource.getRepository(Entity).save({
        name: 'Test Entity',
        kahaId: 'TEST001',
        geohash: 'test123',
        address: 'Test Address',
        location: { type: 'Point', coordinates: [85.3240, 27.7172] },
        radiusMeters: 100,
        avatarUrl: 'test-avatar.jpg',
        coverImageUrl: 'test-cover.jpg',
        description: 'Test Description',
      });

      // Act - Create assignment
      const assignment = await service.createUserEntityAssignment(user.id, entity.id, true);

      // Assert
      expect(assignment.userId).toBe(user.id);
      expect(assignment.entityId).toBe(entity.id);
      expect(assignment.isPrimary).toBe(true);

      // Verify in database
      const savedAssignment = await dataSource.getRepository(UserEntityAssignment).findOne({
        where: { userId: user.id, entityId: entity.id },
      });
      expect(savedAssignment).toBeDefined();
      expect(savedAssignment?.isPrimary).toBe(true);
    });

    it('should prevent duplicate assignments', async () => {
      // Arrange
      const user = await dataSource.getRepository(User).save({
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        isFieldWorker: false,
      });

      const entity = await dataSource.getRepository(Entity).save({
        name: 'Test Entity',
        kahaId: 'TEST001',
        geohash: 'test123',
        address: 'Test Address',
        location: { type: 'Point', coordinates: [85.3240, 27.7172] },
        radiusMeters: 100,
        avatarUrl: 'test-avatar.jpg',
        coverImageUrl: 'test-cover.jpg',
        description: 'Test Description',
      });

      // Create first assignment
      await service.createUserEntityAssignment(user.id, entity.id, false);

      // Act & Assert - Try to create duplicate
      await expect(
        service.createUserEntityAssignment(user.id, entity.id, false)
      ).rejects.toThrow();
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { Department } from './entities/department.entity';
import { DepartmentEntityAssignment } from './entities/department-entity-assignment.entity';
import { Entity } from '../entity/entities/entity.entity';

describe('DepartmentService - Assignment System', () => {
  let service: DepartmentService;
  let departmentRepository: jest.Mocked<Repository<Department>>;
  let assignmentRepository: jest.Mocked<Repository<DepartmentEntityAssignment>>;
  let entityRepository: jest.Mocked<Repository<Entity>>;

  const mockDepartment = {
    id: 'dept-uuid-1',
    name: 'Engineering',
    businessId: 'business-uuid-1',
  };

  const mockEntity = {
    id: 'entity-uuid-1',
    name: 'Main Office',
    kahaId: 'KAHA001',
  };

  const mockAssignment = {
    id: 'assignment-uuid-1',
    departmentId: 'dept-uuid-1',
    entityId: 'entity-uuid-1',
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentService,
        {
          provide: getRepositoryToken(Department),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DepartmentEntityAssignment),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            update: jest.fn(),
            query: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Entity),
          useValue: {
            findOne: jest.fn(),
            query: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DepartmentService>(DepartmentService);
    departmentRepository = module.get(getRepositoryToken(Department));
    assignmentRepository = module.get(getRepositoryToken(DepartmentEntityAssignment));
    entityRepository = module.get(getRepositoryToken(Entity));
  });

  describe('assignEntityToDepartment', () => {
    it('should successfully assign entity to department', async () => {
      // Arrange
      departmentRepository.findOne.mockResolvedValue(mockDepartment as Department);
      entityRepository.findOne.mockResolvedValue(mockEntity as Entity);
      assignmentRepository.findOne.mockResolvedValue(null); // No existing assignment
      assignmentRepository.create.mockReturnValue(mockAssignment as DepartmentEntityAssignment);
      assignmentRepository.save.mockResolvedValue(mockAssignment as DepartmentEntityAssignment);

      // Act
      const result = await service.assignEntityToDepartment('dept-uuid-1', 'entity-uuid-1', false);

      // Assert
      expect(result).toEqual(mockAssignment);
      expect(departmentRepository.findOne).toHaveBeenCalledWith({ where: { id: 'dept-uuid-1' } });
      expect(entityRepository.findOne).toHaveBeenCalledWith({ where: { id: 'entity-uuid-1' } });
      expect(assignmentRepository.findOne).toHaveBeenCalledWith({
        where: { departmentId: 'dept-uuid-1', entityId: 'entity-uuid-1' },
      });
    });

    it('should throw NotFoundException when department does not exist', async () => {
      // Arrange
      departmentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.assignEntityToDepartment('invalid-dept', 'entity-uuid-1', false),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when entity does not exist', async () => {
      // Arrange
      departmentRepository.findOne.mockResolvedValue(mockDepartment as Department);
      entityRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.assignEntityToDepartment('dept-uuid-1', 'invalid-entity', false),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when assignment already exists', async () => {
      // Arrange
      departmentRepository.findOne.mockResolvedValue(mockDepartment as Department);
      entityRepository.findOne.mockResolvedValue(mockEntity as Entity);
      assignmentRepository.findOne.mockResolvedValue(mockAssignment as DepartmentEntityAssignment);

      // Act & Assert
      await expect(
        service.assignEntityToDepartment('dept-uuid-1', 'entity-uuid-1', false),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle primary entity assignment correctly', async () => {
      // Arrange
      departmentRepository.findOne.mockResolvedValue(mockDepartment as Department);
      entityRepository.findOne.mockResolvedValue(mockEntity as Entity);
      assignmentRepository.findOne.mockResolvedValue(null);
      assignmentRepository.create.mockReturnValue({ ...mockAssignment, isPrimary: true } as DepartmentEntityAssignment);
      assignmentRepository.save.mockResolvedValue({ ...mockAssignment, isPrimary: true } as DepartmentEntityAssignment);
      assignmentRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.assignEntityToDepartment('dept-uuid-1', 'entity-uuid-1', true);

      // Assert
      expect(result.isPrimary).toBe(true);
      expect(assignmentRepository.update).toHaveBeenCalledWith(
        { departmentId: 'dept-uuid-1', isPrimary: true },
        { isPrimary: false },
      );
    });
  });

  describe('setPrimaryEntity', () => {
    it('should successfully set entity as primary', async () => {
      // Arrange
      const assignment = { ...mockAssignment, isPrimary: false } as DepartmentEntityAssignment;
      assignmentRepository.findOne.mockResolvedValue(assignment);
      assignmentRepository.update.mockResolvedValue({ affected: 1 } as any);
      assignmentRepository.save.mockResolvedValue({ ...assignment, isPrimary: true } as DepartmentEntityAssignment);

      // Act
      const result = await service.setPrimaryEntity('dept-uuid-1', 'entity-uuid-1');

      // Assert
      expect(result.isPrimary).toBe(true);
      expect(assignmentRepository.update).toHaveBeenCalledWith(
        { departmentId: 'dept-uuid-1', isPrimary: true },
        { isPrimary: false },
      );
    });

    it('should throw NotFoundException when assignment does not exist', async () => {
      // Arrange
      assignmentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.setPrimaryEntity('dept-uuid-1', 'entity-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDepartmentEntities', () => {
    it('should return department entities ordered by primary status', async () => {
      // Arrange
      const assignments = [
        { ...mockAssignment, isPrimary: true, entity: mockEntity },
        { ...mockAssignment, id: 'assignment-uuid-2', isPrimary: false, entity: { ...mockEntity, id: 'entity-uuid-2' } },
      ];
      departmentRepository.findOne.mockResolvedValue(mockDepartment as Department);
      assignmentRepository.find.mockResolvedValue(assignments as DepartmentEntityAssignment[]);

      // Act
      const result = await service.getDepartmentEntities('dept-uuid-1');

      // Assert
      expect(result).toEqual(assignments);
      expect(assignmentRepository.find).toHaveBeenCalledWith({
        where: { departmentId: 'dept-uuid-1' },
        relations: ['entity'],
        order: { isPrimary: 'DESC', createdAt: 'ASC' },
      });
    });

    it('should throw NotFoundException when department does not exist', async () => {
      // Arrange
      departmentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getDepartmentEntities('invalid-dept')).rejects.toThrow(NotFoundException);
    });
  });

  describe('hasUserAccessToEntity', () => {
    it('should return true when user has access to entity', async () => {
      // Arrange
      assignmentRepository.query.mockResolvedValue([{ count: '1' }]);

      // Act
      const result = await service.hasUserAccessToEntity('user-uuid-1', 'entity-uuid-1');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user does not have access to entity', async () => {
      // Arrange
      assignmentRepository.query.mockResolvedValue([{ count: '0' }]);

      // Act
      const result = await service.hasUserAccessToEntity('user-uuid-1', 'entity-uuid-1');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('validateUserDepartmentAccess', () => {
    it('should return access status for user with department and entities', async () => {
      // Arrange
      assignmentRepository.query.mockResolvedValue([{ has_department: true, has_entities: true }]);

      // Act
      const result = await service.validateUserDepartmentAccess('user-uuid-1');

      // Assert
      expect(result).toEqual({ hasDepartment: true, hasEntities: true });
    });

    it('should return false values when user not found', async () => {
      // Arrange
      assignmentRepository.query.mockResolvedValue([]);

      // Act
      const result = await service.validateUserDepartmentAccess('invalid-user');

      // Assert
      expect(result).toEqual({ hasDepartment: false, hasEntities: false });
    });
  });
});
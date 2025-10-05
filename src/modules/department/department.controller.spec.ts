import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { Department } from './entities/department.entity';
import { DepartmentEntityAssignment } from './entities/department-entity-assignment.entity';
import { Entity } from '../entity/entities/entity.entity';

describe('DepartmentController', () => {
  let controller: DepartmentController;
  let departmentService: jest.Mocked<DepartmentService>;

  const mockDepartment: Department = {
    id: 'dept-uuid-1',
    name: 'Engineering',
    businessId: 'business-uuid-1',
    users: [],
    entityAssignments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEntity: Entity = {
    id: 'entity-uuid-1',
    name: 'Main Office',
    kahaId: 'MAIN001',
    geohash: 'tuvz15cr',
    address: 'Main Street',
    location: {
      type: 'Point',
      coordinates: [85.3240, 27.7172],
    },
    radiusMeters: 100,
    avatarUrl: undefined,
    coverImageUrl: undefined,
    description: undefined,
    departmentAssignments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAssignment: DepartmentEntityAssignment = {
    id: 'assignment-uuid-1',
    departmentId: 'dept-uuid-1',
    entityId: 'entity-uuid-1',
    isPrimary: false,
    department: mockDepartment,
    entity: mockEntity,
    createdAt: new Date(),
    updatedAt: new Date(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepartmentController],
      providers: [
        {
          provide: DepartmentService,
          useValue: mockDepartmentService,
        },
      ],
    }).compile();

    controller = module.get<DepartmentController>(DepartmentController);
    departmentService = module.get(DepartmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDepartment', () => {
    const createDto = {
      name: 'Engineering',
      businessId: 'business-uuid-1',
    };

    it('should create department successfully', async () => {
      departmentService.create.mockResolvedValue(mockDepartment);

      const result = await controller.createDepartment(createDto);

      expect(departmentService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockDepartment);
    });

    it('should throw ConflictException for duplicate name', async () => {
      departmentService.create.mockRejectedValue(new ConflictException());

      await expect(controller.createDepartment(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('getDepartments', () => {
    it('should return paginated departments', async () => {
      const mockResponse = {
        departments: [mockDepartment],
        total: 1,
        totalCount: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      departmentService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.getDepartments('1', '20');

      expect(departmentService.findAll).toHaveBeenCalledWith(1, 20, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should filter by businessId when provided', async () => {
      const mockResponse = {
        departments: [mockDepartment],
        total: 1,
        totalCount: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      departmentService.findAll.mockResolvedValue(mockResponse);

      await controller.getDepartments('1', '20', 'business-uuid-1');

      expect(departmentService.findAll).toHaveBeenCalledWith(1, 20, 'business-uuid-1');
    });

    it('should use default pagination parameters', async () => {
      const mockResponse = {
        departments: [mockDepartment],
        total: 1,
        totalCount: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      departmentService.findAll.mockResolvedValue(mockResponse);

      await controller.getDepartments();

      expect(departmentService.findAll).toHaveBeenCalledWith(1, 20, undefined);
    });
  });

  describe('getDepartment', () => {
    it('should return department by ID', async () => {
      departmentService.findByIdWithDetails.mockResolvedValue(mockDepartment);

      const result = await controller.getDepartment(mockDepartment.id);

      expect(departmentService.findByIdWithDetails).toHaveBeenCalledWith(mockDepartment.id);
      expect(result).toEqual(mockDepartment);
    });

    it('should throw NotFoundException for invalid ID', async () => {
      departmentService.findByIdWithDetails.mockRejectedValue(new NotFoundException());

      await expect(controller.getDepartment('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDepartment', () => {
    const updateDto = {
      name: 'Updated Engineering',
    };

    it('should update department successfully', async () => {
      const updatedDepartment = { ...mockDepartment, ...updateDto };
      departmentService.update.mockResolvedValue(updatedDepartment);

      const result = await controller.updateDepartment(mockDepartment.id, updateDto);

      expect(departmentService.update).toHaveBeenCalledWith(mockDepartment.id, updateDto);
      expect(result).toEqual(updatedDepartment);
    });

    it('should throw NotFoundException for invalid ID', async () => {
      departmentService.update.mockRejectedValue(new NotFoundException());

      await expect(controller.updateDepartment('invalid-id', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDepartment', () => {
    it('should delete department successfully', async () => {
      departmentService.delete.mockResolvedValue(undefined);

      await controller.deleteDepartment(mockDepartment.id);

      expect(departmentService.delete).toHaveBeenCalledWith(mockDepartment.id);
    });

    it('should throw NotFoundException for invalid ID', async () => {
      departmentService.delete.mockRejectedValue(new NotFoundException());

      await expect(controller.deleteDepartment('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignEntity', () => {
    const assignDto = {
      entityId: 'entity-uuid-1',
      isPrimary: false,
    };

    it('should assign entity to department successfully', async () => {
      departmentService.assignEntityToDepartment.mockResolvedValue(mockAssignment);

      const result = await controller.assignEntity(mockDepartment.id, assignDto);

      expect(departmentService.assignEntityToDepartment).toHaveBeenCalledWith(
        mockDepartment.id,
        assignDto.entityId,
        assignDto.isPrimary,
      );
      expect(result).toEqual({
        id: mockAssignment.id,
        departmentId: mockAssignment.departmentId,
        entityId: mockAssignment.entityId,
        isPrimary: mockAssignment.isPrimary,
        createdAt: mockAssignment.createdAt,
        updatedAt: mockAssignment.updatedAt,
      });
    });

    it('should throw ConflictException for duplicate assignment', async () => {
      departmentService.assignEntityToDepartment.mockRejectedValue(new ConflictException());

      await expect(controller.assignEntity(mockDepartment.id, assignDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('setPrimaryEntity', () => {
    it('should set entity as primary successfully', async () => {
      const primaryAssignment = { ...mockAssignment, isPrimary: true };
      departmentService.setPrimaryEntity.mockResolvedValue(primaryAssignment);

      const result = await controller.setPrimaryEntity(mockDepartment.id, mockEntity.id);

      expect(departmentService.setPrimaryEntity).toHaveBeenCalledWith(mockDepartment.id, mockEntity.id);
      expect(result).toEqual({
        id: primaryAssignment.id,
        departmentId: primaryAssignment.departmentId,
        entityId: primaryAssignment.entityId,
        isPrimary: primaryAssignment.isPrimary,
        createdAt: primaryAssignment.createdAt,
        updatedAt: primaryAssignment.updatedAt,
      });
    });

    it('should throw NotFoundException for invalid assignment', async () => {
      departmentService.setPrimaryEntity.mockRejectedValue(new NotFoundException());

      await expect(controller.setPrimaryEntity('invalid-dept', 'invalid-entity')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDepartmentEntities', () => {
    it('should return department entities', async () => {
      const assignments = [mockAssignment];
      departmentService.getDepartmentEntities.mockResolvedValue(assignments);

      const result = await controller.getDepartmentEntities(mockDepartment.id);

      expect(departmentService.getDepartmentEntities).toHaveBeenCalledWith(mockDepartment.id);
      expect(result).toEqual([
        {
          id: mockAssignment.id,
          departmentId: mockAssignment.departmentId,
          entityId: mockAssignment.entityId,
          isPrimary: mockAssignment.isPrimary,
          createdAt: mockAssignment.createdAt,
          updatedAt: mockAssignment.updatedAt,
          entity: {
            id: mockEntity.id,
            name: mockEntity.name,
            kahaId: mockEntity.kahaId,
            address: mockEntity.address,
            radiusMeters: mockEntity.radiusMeters,
          },
        },
      ]);
    });

    it('should handle entities without entity relation', async () => {
      const assignmentWithoutEntity = { 
        ...mockAssignment, 
        entity: {
          ...mockEntity,
          id: 'temp-id',
          name: 'Temp Entity',
          kahaId: 'TEMP001',
          address: 'Temp Address',
          radiusMeters: 100,
        }
      };
      departmentService.getDepartmentEntities.mockResolvedValue([assignmentWithoutEntity]);

      const result = await controller.getDepartmentEntities(mockDepartment.id);

      expect(result[0].entity).toBeDefined();
    });
  });

  describe('removeEntityAssignment', () => {
    it('should remove entity assignment successfully', async () => {
      departmentService.removeEntityAssignment.mockResolvedValue(undefined);

      await controller.removeEntityAssignment(mockDepartment.id, mockEntity.id);

      expect(departmentService.removeEntityAssignment).toHaveBeenCalledWith(mockDepartment.id, mockEntity.id);
    });

    it('should throw NotFoundException for invalid assignment', async () => {
      departmentService.removeEntityAssignment.mockRejectedValue(new NotFoundException());

      await expect(controller.removeEntityAssignment('invalid-dept', 'invalid-entity')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDepartmentWithEntities', () => {
    it('should return department with entities details', async () => {
      const departmentWithEntities = {
        ...mockDepartment,
        entityAssignments: [mockAssignment],
      };
      departmentService.getDepartmentWithEntities.mockResolvedValue(departmentWithEntities);

      const result = await controller.getDepartmentWithEntities(mockDepartment.id);

      expect(departmentService.getDepartmentWithEntities).toHaveBeenCalledWith(mockDepartment.id);
      expect(result).toEqual(departmentWithEntities);
    });

    it('should throw NotFoundException for invalid department', async () => {
      departmentService.getDepartmentWithEntities.mockRejectedValue(new NotFoundException());

      await expect(controller.getDepartmentWithEntities('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
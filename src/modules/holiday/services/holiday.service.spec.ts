import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { HolidayService } from './holiday.service';
import { HolidayRepository } from '../repositories/holiday.repository';
import { HolidayType, RecurrenceType } from '../entities/holiday.entity';

describe('HolidayService', () => {
  let service: HolidayService;
  let repository: jest.Mocked<HolidayRepository>;

  const mockHolidayRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    findByDateRange: jest.fn(),
    findByDate: jest.fn(),
    findByType: jest.fn(),
    findByDepartment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HolidayService,
        {
          provide: HolidayRepository,
          useValue: mockHolidayRepository,
        },
      ],
    }).compile();

    service = module.get<HolidayService>(HolidayService);
    repository = module.get(HolidayRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createHoliday', () => {
    it('should create a company holiday successfully', async () => {
      const createDto = {
        name: 'New Year',
        date: '2025-01-01',
        type: HolidayType.COMPANY,
        recurrence: RecurrenceType.YEARLY,
        description: 'New Year celebration',
        isActive: true,
      };

      const mockHoliday = {
        id: 'holiday-uuid',
        ...createDto,
        date: new Date('2025-01-01'),
      };

      repository.find.mockResolvedValue([]);
      repository.create.mockReturnValue(mockHoliday as any);
      repository.save.mockResolvedValue(mockHoliday as any);

      const result = await service.createHoliday(createDto);

      expect(repository.find).toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        date: new Date('2025-01-01'),
      });
      expect(repository.save).toHaveBeenCalledWith(mockHoliday);
      expect(result).toEqual(mockHoliday);
    });

    it('should require department ID for department-specific holidays', async () => {
      const createDto = {
        name: 'Department Day',
        date: '2025-06-15',
        type: HolidayType.DEPARTMENT,
        recurrence: RecurrenceType.NONE,
      };

      await expect(service.createHoliday(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.createHoliday(createDto)).rejects.toThrow(
        'Department ID is required for department-specific holidays',
      );
    });

    it('should reject department ID for non-department holidays', async () => {
      const createDto = {
        name: 'National Day',
        date: '2025-07-04',
        type: HolidayType.NATIONAL,
        departmentId: 'dept-uuid',
        recurrence: RecurrenceType.YEARLY,
      };

      await expect(service.createHoliday(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.createHoliday(createDto)).rejects.toThrow(
        'Department ID should not be provided for non-department holidays',
      );
    });

    it('should detect holiday conflicts', async () => {
      const createDto = {
        name: 'Conflicting Holiday',
        date: '2025-01-01',
        type: HolidayType.COMPANY,
      };

      const existingHoliday = {
        id: 'existing-uuid',
        name: 'New Year',
        date: new Date('2025-01-01'),
        type: HolidayType.COMPANY,
        recurrence: RecurrenceType.YEARLY,
        isActive: true,
      };

      repository.find.mockResolvedValue([existingHoliday as any]);

      await expect(service.createHoliday(createDto)).rejects.toThrow(ConflictException);
      await expect(service.createHoliday(createDto)).rejects.toThrow(
        'Holiday conflict detected on 2025-01-01. Existing holidays: New Year',
      );
    });
  });

  describe('updateHoliday', () => {
    it('should update a holiday successfully', async () => {
      const holidayId = 'holiday-uuid';
      const updateDto = {
        name: 'Updated Holiday Name',
        description: 'Updated description',
      };

      const existingHoliday = {
        id: holidayId,
        name: 'Original Holiday',
        date: new Date('2025-01-01'),
        type: HolidayType.COMPANY,
        departmentId: null,
      };

      const updatedHoliday = {
        ...existingHoliday,
        ...updateDto,
      };

      repository.findOne.mockResolvedValue(existingHoliday as any);
      repository.save.mockResolvedValue(updatedHoliday as any);

      const result = await service.updateHoliday(holidayId, updateDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: holidayId },
        relations: ['department'],
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedHoliday);
    });

    it('should throw NotFoundException for non-existent holiday', async () => {
      const holidayId = 'non-existent-uuid';
      const updateDto = { name: 'Updated Name' };

      repository.findOne.mockResolvedValue(null);

      await expect(service.updateHoliday(holidayId, updateDto)).rejects.toThrow(NotFoundException);
      await expect(service.updateHoliday(holidayId, updateDto)).rejects.toThrow(
        `Holiday with ID ${holidayId} not found`,
      );
    });
  });

  describe('isHoliday', () => {
    it('should return true for a holiday date', async () => {
      const testDate = new Date('2025-01-01');
      const mockHoliday = {
        id: 'holiday-uuid',
        name: 'New Year',
        date: new Date('2025-01-01'),
        type: HolidayType.COMPANY,
        recurrence: RecurrenceType.YEARLY,
        isActive: true,
      };

      repository.find.mockResolvedValue([mockHoliday as any]);

      const result = await service.isHoliday(testDate);

      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        relations: ['department'],
      });
      expect(result).toBe(true);
    });

    it('should return false for a non-holiday date', async () => {
      const testDate = new Date('2025-01-02');
      repository.find.mockResolvedValue([]);

      const result = await service.isHoliday(testDate);

      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        relations: ['department'],
      });
      expect(result).toBe(false);
    });

    it('should check holidays with department filtering', async () => {
      const testDate = new Date('2025-01-01');
      const departmentId = 'dept-uuid';
      const mockHoliday = {
        id: 'holiday-uuid',
        name: 'Department Holiday',
        date: new Date('2025-01-01'),
        type: HolidayType.DEPARTMENT,
        departmentId: departmentId,
        recurrence: RecurrenceType.NONE,
        isActive: true,
      };

      repository.find.mockResolvedValue([mockHoliday as any]);

      const result = await service.isHoliday(testDate, departmentId);

      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        relations: ['department'],
      });
      expect(result).toBe(true);
    });
  });

  describe('getHolidays', () => {
    it('should return holidays by date range', async () => {
      const queryDto = {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };

      const mockHolidays = [
        { id: '1', name: 'New Year', date: new Date('2025-01-01') },
        { id: '2', name: 'Christmas', date: new Date('2025-12-25') },
      ];

      repository.findByDateRange.mockResolvedValue(mockHolidays as any);

      const result = await service.getHolidays(queryDto);

      expect(repository.findByDateRange).toHaveBeenCalledWith(
        new Date('2025-01-01'),
        new Date('2025-12-31'),
        undefined,
      );
      expect(result).toEqual(mockHolidays);
    });

    it('should return holidays by type', async () => {
      const queryDto = {
        type: HolidayType.NATIONAL,
      };

      const mockHolidays = [
        { id: '1', name: 'Independence Day', type: HolidayType.NATIONAL },
      ];

      repository.findByType.mockResolvedValue(mockHolidays as any);

      const result = await service.getHolidays(queryDto);

      expect(repository.findByType).toHaveBeenCalledWith(HolidayType.NATIONAL);
      expect(result).toEqual(mockHolidays);
    });

    it('should return all active holidays when no filters provided', async () => {
      const queryDto = {};

      const mockHolidays = [
        { id: '1', name: 'Holiday 1', isActive: true },
        { id: '2', name: 'Holiday 2', isActive: true },
      ];

      repository.find.mockResolvedValue(mockHolidays as any);

      const result = await service.getHolidays(queryDto);

      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        relations: ['department'],
        order: { date: 'ASC' },
      });
      expect(result).toEqual(mockHolidays);
    });
  });

  describe('deleteHoliday', () => {
    it('should delete a holiday successfully', async () => {
      const holidayId = 'holiday-uuid';
      const existingHoliday = {
        id: holidayId,
        name: 'Holiday to Delete',
      };

      repository.findOne.mockResolvedValue(existingHoliday as any);
      repository.remove.mockResolvedValue(existingHoliday as any);

      await service.deleteHoliday(holidayId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: holidayId },
        relations: ['department'],
      });
      expect(repository.remove).toHaveBeenCalledWith(existingHoliday);
    });

    it('should throw NotFoundException for non-existent holiday', async () => {
      const holidayId = 'non-existent-uuid';

      repository.findOne.mockResolvedValue(null);

      await expect(service.deleteHoliday(holidayId)).rejects.toThrow(NotFoundException);
      await expect(service.deleteHoliday(holidayId)).rejects.toThrow(
        `Holiday with ID ${holidayId} not found`,
      );
    });
  });
});
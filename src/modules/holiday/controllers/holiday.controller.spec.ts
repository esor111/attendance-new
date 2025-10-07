import { Test, TestingModule } from '@nestjs/testing';
import { HolidayController } from './holiday.controller';
import { HolidayService } from '../services/holiday.service';
import { HolidayType, RecurrenceType } from '../entities/holiday.entity';

describe('HolidayController', () => {
  let controller: HolidayController;
  let holidayService: jest.Mocked<HolidayService>;

  const mockHolidayService = {
    createHoliday: jest.fn(),
    getHolidays: jest.fn(),
    findHolidayById: jest.fn(),
    updateHoliday: jest.fn(),
    deleteHoliday: jest.fn(),
    isHoliday: jest.fn(),
    getHolidaysByDate: jest.fn(),
    getHolidaysForYear: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HolidayController],
      providers: [
        {
          provide: HolidayService,
          useValue: mockHolidayService,
        },
      ],
    }).compile();

    controller = module.get<HolidayController>(HolidayController);
    holidayService = module.get(HolidayService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createHoliday', () => {
    it('should create a holiday successfully', async () => {
      const createDto = {
        name: 'Test Holiday',
        date: '2025-01-01',
        type: HolidayType.COMPANY,
        recurrence: RecurrenceType.YEARLY,
        description: 'Test holiday description',
        isActive: true,
      };

      const mockHoliday = {
        id: 'holiday-uuid',
        ...createDto,
        date: new Date('2025-01-01'),
      };

      holidayService.createHoliday.mockResolvedValue(mockHoliday as any);

      const result = await controller.createHoliday(createDto);

      expect(holidayService.createHoliday).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockHoliday);
    });
  });

  describe('getHolidays', () => {
    it('should return holidays with query filters', async () => {
      const queryDto = {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        type: HolidayType.NATIONAL,
      };

      const mockHolidays = [
        {
          id: '1',
          name: 'New Year',
          date: new Date('2025-01-01'),
          type: HolidayType.NATIONAL,
        },
      ];

      holidayService.getHolidays.mockResolvedValue(mockHolidays as any);

      const result = await controller.getHolidays(queryDto);

      expect(holidayService.getHolidays).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(mockHolidays);
    });
  });

  describe('getYearlyHolidays', () => {
    it('should return holidays for year with real-time calculation', async () => {
      const year = 2025;
      const departmentId = 'dept-uuid';

      const mockYearlyHolidays = [
        {
          id: 'holiday-1',
          name: 'New Year',
          date: new Date('2025-01-01'),
          type: HolidayType.COMPANY,
          actualDate: new Date('2025-01-01'),
        },
      ];

      holidayService.getHolidaysForYear.mockResolvedValue(mockYearlyHolidays as any);

      const result = await controller.getYearlyHolidays(year, departmentId);

      expect(holidayService.getHolidaysForYear).toHaveBeenCalledWith(year, departmentId);
      expect(result).toEqual(mockYearlyHolidays);
    });

    it('should return holidays for year without department filtering', async () => {
      const year = 2025;

      const mockYearlyHolidays = [
        {
          id: 'holiday-1',
          name: 'New Year',
          date: new Date('2025-01-01'),
          type: HolidayType.NATIONAL,
          actualDate: new Date('2025-01-01'),
        },
      ];

      holidayService.getHolidaysForYear.mockResolvedValue(mockYearlyHolidays as any);

      const result = await controller.getYearlyHolidays(year);

      expect(holidayService.getHolidaysForYear).toHaveBeenCalledWith(year, undefined);
      expect(result).toEqual(mockYearlyHolidays);
    });
  });

  describe('checkHolidayDate', () => {
    it('should check if date is a holiday', async () => {
      const date = '2025-01-01';
      const departmentId = 'dept-uuid';

      const mockHolidays = [
        {
          id: '1',
          name: 'New Year',
          date: new Date('2025-01-01'),
        },
      ];

      holidayService.isHoliday.mockResolvedValue(true);
      holidayService.getHolidaysByDate.mockResolvedValue(mockHolidays as any);

      const result = await controller.checkHolidayDate(date, departmentId);

      expect(holidayService.isHoliday).toHaveBeenCalledWith(new Date(date), departmentId);
      expect(holidayService.getHolidaysByDate).toHaveBeenCalledWith(new Date(date), departmentId);
      expect(result).toEqual({
        isHoliday: true,
        holidays: mockHolidays,
      });
    });

    it('should return false for non-holiday date', async () => {
      const date = '2025-01-02';

      holidayService.isHoliday.mockResolvedValue(false);
      holidayService.getHolidaysByDate.mockResolvedValue([]);

      const result = await controller.checkHolidayDate(date);

      expect(result).toEqual({
        isHoliday: false,
        holidays: [],
      });
    });
  });

  describe('updateHoliday', () => {
    it('should update a holiday successfully', async () => {
      const holidayId = 'holiday-uuid';
      const updateDto = {
        name: 'Updated Holiday Name',
        description: 'Updated description',
      };

      const mockUpdatedHoliday = {
        id: holidayId,
        name: 'Updated Holiday Name',
        description: 'Updated description',
        date: new Date('2025-01-01'),
        type: HolidayType.COMPANY,
      };

      holidayService.updateHoliday.mockResolvedValue(mockUpdatedHoliday as any);

      const result = await controller.updateHoliday(holidayId, updateDto);

      expect(holidayService.updateHoliday).toHaveBeenCalledWith(holidayId, updateDto);
      expect(result).toEqual(mockUpdatedHoliday);
    });
  });

  describe('deleteHoliday', () => {
    it('should delete a holiday successfully', async () => {
      const holidayId = 'holiday-uuid';

      holidayService.deleteHoliday.mockResolvedValue(undefined);

      const result = await controller.deleteHoliday(holidayId);

      expect(holidayService.deleteHoliday).toHaveBeenCalledWith(holidayId);
      expect(result).toEqual({ message: 'Holiday deleted successfully' });
    });
  });
});
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { HolidayRepository } from '../repositories/holiday.repository';
import { CreateHolidayDto } from '../dto/create-holiday.dto';
import { UpdateHolidayDto } from '../dto/update-holiday.dto';
import { HolidayQueryDto } from '../dto/holiday-query.dto';
import { Holiday, HolidayType, RecurrenceType } from '../entities/holiday.entity';

/**
 * Holiday Service - Manages holiday creation, updates, and queries
 * Handles business logic for holiday management including validation
 * Provides methods for date checking and holiday conflict resolution
 */
@Injectable()
export class HolidayService {
  constructor(private readonly holidayRepository: HolidayRepository) {}

  /**
   * Create a new holiday with validation
   */
  async createHoliday(createHolidayDto: CreateHolidayDto): Promise<Holiday> {
    // Validate department requirement for department-specific holidays
    if (createHolidayDto.type === HolidayType.DEPARTMENT && !createHolidayDto.departmentId) {
      throw new BadRequestException('Department ID is required for department-specific holidays');
    }

    // Validate that non-department holidays don't have department ID
    if (createHolidayDto.type !== HolidayType.DEPARTMENT && createHolidayDto.departmentId) {
      throw new BadRequestException('Department ID should not be provided for non-department holidays');
    }

    const holidayDate = new Date(createHolidayDto.date);

    // Check for existing holiday conflicts
    await this.validateHolidayConflicts(
      holidayDate,
      createHolidayDto.type,
      createHolidayDto.departmentId,
    );

    const holiday = this.holidayRepository.create({
      ...createHolidayDto,
      date: holidayDate,
    });

    return this.holidayRepository.save(holiday);
  }

  /**
   * Update an existing holiday
   */
  async updateHoliday(id: string, updateHolidayDto: UpdateHolidayDto): Promise<Holiday> {
    const holiday = await this.findHolidayById(id);

    // Validate department requirement if type is being changed
    if (updateHolidayDto.type === HolidayType.DEPARTMENT && !updateHolidayDto.departmentId && !holiday.departmentId) {
      throw new BadRequestException('Department ID is required for department-specific holidays');
    }

    // Validate that non-department holidays don't have department ID
    if (updateHolidayDto.type && updateHolidayDto.type !== HolidayType.DEPARTMENT && updateHolidayDto.departmentId) {
      throw new BadRequestException('Department ID should not be provided for non-department holidays');
    }

    // Check for conflicts if date or type is being changed
    if (updateHolidayDto.date || updateHolidayDto.type || updateHolidayDto.departmentId !== undefined) {
      const newDate = updateHolidayDto.date ? new Date(updateHolidayDto.date) : holiday.date;
      const newType = updateHolidayDto.type || holiday.type;
      const newDepartmentId = updateHolidayDto.departmentId !== undefined ? updateHolidayDto.departmentId : holiday.departmentId;

      await this.validateHolidayConflicts(newDate, newType, newDepartmentId, id);
    }

    Object.assign(holiday, updateHolidayDto);
    if (updateHolidayDto.date) {
      holiday.date = new Date(updateHolidayDto.date);
    }

    return this.holidayRepository.save(holiday);
  }

  /**
   * Delete a holiday
   */
  async deleteHoliday(id: string): Promise<void> {
    const holiday = await this.findHolidayById(id);
    await this.holidayRepository.remove(holiday);
  }

  /**
   * Find holiday by ID
   */
  async findHolidayById(id: string): Promise<Holiday> {
    const holiday = await this.holidayRepository.findOne({
      where: { id },
      relations: ['department'],
    });

    if (!holiday) {
      throw new NotFoundException(`Holiday with ID ${id} not found`);
    }

    return holiday;
  }

  /**
   * Get holidays with optional filtering
   */
  async getHolidays(queryDto: HolidayQueryDto): Promise<Holiday[]> {
    // If date range is provided, use date range query
    if (queryDto.startDate && queryDto.endDate) {
      return this.holidayRepository.findByDateRange(
        new Date(queryDto.startDate),
        new Date(queryDto.endDate),
        queryDto.departmentId,
      );
    }

    // If type is provided, filter by type
    if (queryDto.type) {
      return this.holidayRepository.findByType(queryDto.type);
    }

    // If department is provided, filter by department
    if (queryDto.departmentId) {
      return this.holidayRepository.findByDepartment(queryDto.departmentId);
    }

    // Default: return all active holidays
    return this.holidayRepository.find({
      where: { isActive: true },
      relations: ['department'],
      order: { date: 'ASC' },
    });
  }

  /**
   * Check if a specific date is a holiday using real-time calculation
   */
  async isHoliday(date: Date, departmentId?: string): Promise<boolean> {
    const holidays = await this.getHolidaysForDate(date, departmentId);
    return holidays.length > 0;
  }

  /**
   * Get holidays for a specific date using real-time calculation
   */
  async getHolidaysByDate(date: Date, departmentId?: string): Promise<Holiday[]> {
    return this.getHolidaysForDate(date, departmentId);
  }

  /**
   * Get holidays for a specific date using real-time calculation
   * Replaces the old calendar-based approach with computed dates
   */
  async getHolidaysForDate(date: Date, departmentId?: string): Promise<Holiday[]> {
    // Get all active holidays that could apply to this date
    const allHolidays = await this.holidayRepository.find({
      where: { isActive: true },
      relations: ['department'],
    });

    const matchingHolidays: Holiday[] = [];

    for (const holiday of allHolidays) {
      // Check department filtering
      if (departmentId) {
        // For department-specific holidays, must match the department
        if (holiday.type === HolidayType.DEPARTMENT && holiday.departmentId !== departmentId) {
          continue;
        }
        // For non-department holidays, they apply to all departments
      } else {
        // If no department specified, only include non-department holidays
        if (holiday.type === HolidayType.DEPARTMENT) {
          continue;
        }
      }

      // Check if the holiday matches the given date based on recurrence
      if (this.doesHolidayMatchDate(holiday, date)) {
        matchingHolidays.push(holiday);
      }
    }

    return matchingHolidays;
  }

  /**
   * Get holidays for a specific year with optional department filtering
   * Replaces the old calendar generation with real-time calculation
   */
  async getHolidaysForYear(year: number, departmentId?: string): Promise<Array<Holiday & { actualDate: Date }>> {
    // Get all active holidays
    const allHolidays = await this.holidayRepository.find({
      where: { isActive: true },
      relations: ['department'],
    });

    const yearHolidays: Array<Holiday & { actualDate: Date }> = [];

    for (const holiday of allHolidays) {
      // Check department filtering
      if (departmentId) {
        if (holiday.type === HolidayType.DEPARTMENT && holiday.departmentId !== departmentId) {
          continue;
        }
      } else {
        if (holiday.type === HolidayType.DEPARTMENT) {
          continue;
        }
      }

      // Calculate actual dates for this year based on recurrence
      const actualDates = this.calculateHolidayDatesForYear(holiday, year);
      
      for (const actualDate of actualDates) {
        yearHolidays.push({
          ...holiday,
          actualDate,
        });
      }
    }

    // Sort by actual date
    yearHolidays.sort((a, b) => a.actualDate.getTime() - b.actualDate.getTime());

    return yearHolidays;
  }

  /**
   * Get holidays for a date range with optional department filtering
   */
  async getHolidaysForDateRange(
    startDate: Date,
    endDate: Date,
    departmentId?: string,
  ): Promise<Array<Holiday & { actualDate: Date }>> {
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    const allHolidays: Array<Holiday & { actualDate: Date }> = [];

    // Get holidays for each year in the range
    for (let year = startYear; year <= endYear; year++) {
      const yearHolidays = await this.getHolidaysForYear(year, departmentId);
      allHolidays.push(...yearHolidays);
    }

    // Filter by date range
    return allHolidays.filter(holiday => 
      holiday.actualDate >= startDate && holiday.actualDate <= endDate
    );
  }

  /**
   * Check if a holiday matches a specific date based on its recurrence pattern
   */
  private doesHolidayMatchDate(holiday: Holiday, date: Date): boolean {
    const holidayDate = new Date(holiday.date);
    
    switch (holiday.recurrence) {
      case RecurrenceType.YEARLY:
        // Match if month and day are the same
        return (
          holidayDate.getMonth() === date.getMonth() &&
          holidayDate.getDate() === date.getDate()
        );
      
      case RecurrenceType.MONTHLY:
        // Match if day of month is the same
        return holidayDate.getDate() === date.getDate();
      
      case RecurrenceType.NONE:
      default:
        // Match if exact date is the same
        return (
          holidayDate.getFullYear() === date.getFullYear() &&
          holidayDate.getMonth() === date.getMonth() &&
          holidayDate.getDate() === date.getDate()
        );
    }
  }

  /**
   * Calculate all actual dates for a holiday in a specific year
   */
  private calculateHolidayDatesForYear(holiday: Holiday, year: number): Date[] {
    const holidayDate = new Date(holiday.date);
    const dates: Date[] = [];

    switch (holiday.recurrence) {
      case RecurrenceType.YEARLY:
        // Create date for the same month/day in the target year
        const yearlyDate = new Date(year, holidayDate.getMonth(), holidayDate.getDate());
        // Only add if the date is valid (handles leap year edge cases)
        if (yearlyDate.getMonth() === holidayDate.getMonth()) {
          dates.push(yearlyDate);
        }
        break;

      case RecurrenceType.MONTHLY:
        // Create date for the same day of each month in the target year
        const dayOfMonth = holidayDate.getDate();
        for (let month = 0; month < 12; month++) {
          const monthlyDate = new Date(year, month, dayOfMonth);
          // Only add if the date is valid (handles months with fewer days)
          if (monthlyDate.getMonth() === month && monthlyDate.getDate() === dayOfMonth) {
            dates.push(monthlyDate);
          }
        }
        break;

      case RecurrenceType.NONE:
      default:
        // Only include if the holiday's year matches the requested year
        if (holidayDate.getFullYear() === year) {
          dates.push(new Date(holidayDate));
        }
        break;
    }

    return dates;
  }

  /**
   * Validate holiday conflicts using real-time calculation
   */
  private async validateHolidayConflicts(
    date: Date,
    _type: HolidayType,
    departmentId?: string,
    excludeId?: string,
  ): Promise<void> {
    const existingHolidays = await this.getHolidaysForDate(date, departmentId);

    // Filter out the holiday being updated
    const conflictingHolidays = existingHolidays.filter(holiday => holiday.id !== excludeId);

    if (conflictingHolidays.length > 0) {
      const conflictNames = conflictingHolidays.map(h => h.name).join(', ');
      throw new ConflictException(
        `Holiday conflict detected on ${date.toISOString().split('T')[0]}. Existing holidays: ${conflictNames}`,
      );
    }
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { HolidayCalendarRepository } from '../repositories/holiday-calendar.repository';
import { HolidayRepository } from '../repositories/holiday.repository';
import { HolidayCalendar } from '../entities/holiday-calendar.entity';
import { Holiday, RecurrenceType } from '../entities/holiday.entity';

/**
 * Holiday Calendar Service - Manages automatic calendar generation and department-specific holidays
 * Handles yearly calendar creation, recurring holiday processing, and calendar queries
 * Provides methods for calendar management and holiday date resolution
 */
@Injectable()
export class HolidayCalendarService {
  private readonly logger = new Logger(HolidayCalendarService.name);

  constructor(
    private readonly holidayCalendarRepository: HolidayCalendarRepository,
    private readonly holidayRepository: HolidayRepository,
  ) {}

  /**
   * Generate calendar for a specific year
   */
  async generateCalendarForYear(year: number): Promise<HolidayCalendar[]> {
    this.logger.log(`Generating holiday calendar for year ${year}`);

    // Check if calendar already exists for this year
    const existingCalendar = await this.holidayCalendarRepository.existsForYear(year);
    if (existingCalendar) {
      this.logger.warn(`Calendar for year ${year} already exists. Regenerating...`);
      await this.holidayCalendarRepository.deleteByYear(year);
    }

    const holidays = await this.holidayRepository.find({
      where: { isActive: true },
      relations: ['department'],
    });

    const calendarEntries: HolidayCalendar[] = [];

    for (const holiday of holidays) {
      const entries = await this.generateCalendarEntriesForHoliday(holiday, year);
      calendarEntries.push(...entries);
    }

    if (calendarEntries.length > 0) {
      return this.holidayCalendarRepository.save(calendarEntries);
    }

    return [];
  }

  /**
   * Get calendar for a specific year with optional department filtering
   */
  async getCalendarForYear(year: number, departmentId?: string): Promise<HolidayCalendar[]> {
    return this.holidayCalendarRepository.findByYear(year, departmentId);
  }

  /**
   * Get calendar entries for a date range
   */
  async getCalendarForDateRange(
    startDate: Date,
    endDate: Date,
    departmentId?: string,
  ): Promise<HolidayCalendar[]> {
    return this.holidayCalendarRepository.findByDateRange(startDate, endDate, departmentId);
  }

  /**
   * Check if a specific date is a holiday in the calendar
   */
  async isHolidayDate(date: Date, departmentId?: string): Promise<boolean> {
    return this.holidayCalendarRepository.isHolidayDate(date, departmentId);
  }

  /**
   * Get holiday calendar entries for a specific date
   */
  async getCalendarEntriesForDate(date: Date, departmentId?: string): Promise<HolidayCalendar[]> {
    return this.holidayCalendarRepository.findByDate(date, departmentId);
  }

  /**
   * Regenerate calendar for multiple years
   */
  async regenerateCalendars(years: number[]): Promise<void> {
    this.logger.log(`Regenerating calendars for years: ${years.join(', ')}`);

    for (const year of years) {
      await this.generateCalendarForYear(year);
    }

    this.logger.log('Calendar regeneration completed');
  }

  /**
   * Generate calendar entries for a specific holiday and year
   */
  private async generateCalendarEntriesForHoliday(
    holiday: Holiday,
    year: number,
  ): Promise<HolidayCalendar[]> {
    const entries: HolidayCalendar[] = [];

    switch (holiday.recurrence) {
      case RecurrenceType.YEARLY:
        entries.push(...this.generateYearlyRecurrence(holiday, year));
        break;
      case RecurrenceType.MONTHLY:
        entries.push(...this.generateMonthlyRecurrence(holiday, year));
        break;
      case RecurrenceType.NONE:
      default:
        entries.push(...this.generateSingleOccurrence(holiday, year));
        break;
    }

    return entries;
  }

  /**
   * Generate yearly recurring holiday entries
   */
  private generateYearlyRecurrence(holiday: Holiday, year: number): HolidayCalendar[] {
    const originalDate = new Date(holiday.date);
    const actualDate = new Date(year, originalDate.getMonth(), originalDate.getDate());

    // Only generate if the date is valid (handles leap year edge cases)
    if (actualDate.getMonth() === originalDate.getMonth()) {
      return [this.createCalendarEntry(holiday, year, actualDate)];
    }

    return [];
  }

  /**
   * Generate monthly recurring holiday entries
   */
  private generateMonthlyRecurrence(holiday: Holiday, year: number): HolidayCalendar[] {
    const entries: HolidayCalendar[] = [];
    const originalDate = new Date(holiday.date);
    const dayOfMonth = originalDate.getDate();

    for (let month = 0; month < 12; month++) {
      const actualDate = new Date(year, month, dayOfMonth);

      // Only add if the date is valid (handles months with fewer days)
      if (actualDate.getMonth() === month && actualDate.getDate() === dayOfMonth) {
        entries.push(this.createCalendarEntry(holiday, year, actualDate));
      }
    }

    return entries;
  }

  /**
   * Generate single occurrence holiday entry
   */
  private generateSingleOccurrence(holiday: Holiday, year: number): HolidayCalendar[] {
    const originalDate = new Date(holiday.date);

    // Only include if the holiday's year matches the requested year
    if (originalDate.getFullYear() === year) {
      return [this.createCalendarEntry(holiday, year, originalDate)];
    }

    return [];
  }

  /**
   * Create a calendar entry
   */
  private createCalendarEntry(
    holiday: Holiday,
    year: number,
    actualDate: Date,
  ): HolidayCalendar {
    const calendarEntry = new HolidayCalendar();
    calendarEntry.holidayId = holiday.id;
    calendarEntry.year = year;
    calendarEntry.actualDate = actualDate;
    calendarEntry.departmentId = holiday.departmentId;

    return calendarEntry;
  }
}
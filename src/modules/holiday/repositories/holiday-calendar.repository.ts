import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HolidayCalendar } from '../entities/holiday-calendar.entity';

/**
 * Holiday Calendar Repository - Handles database operations for holiday calendars
 * Manages yearly calendar generation and department-specific holiday associations
 * Provides methods for calendar queries and automatic calendar management
 */
@Injectable()
export class HolidayCalendarRepository extends Repository<HolidayCalendar> {
  constructor(private dataSource: DataSource) {
    super(HolidayCalendar, dataSource.createEntityManager());
  }

  /**
   * Find calendar entries by year with optional department filtering
   */
  async findByYear(year: number, departmentId?: string): Promise<HolidayCalendar[]> {
    const query = this.createQueryBuilder('calendar')
      .leftJoinAndSelect('calendar.holiday', 'holiday')
      .leftJoinAndSelect('calendar.department', 'department')
      .where('calendar.year = :year', { year })
      .andWhere('holiday.isActive = :isActive', { isActive: true });

    if (departmentId) {
      query.andWhere(
        '(calendar.departmentId = :departmentId OR calendar.departmentId IS NULL)',
        { departmentId },
      );
    } else {
      query.andWhere('calendar.departmentId IS NULL');
    }

    return query.orderBy('calendar.actualDate', 'ASC').getMany();
  }

  /**
   * Find calendar entries by date range
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    departmentId?: string,
  ): Promise<HolidayCalendar[]> {
    const query = this.createQueryBuilder('calendar')
      .leftJoinAndSelect('calendar.holiday', 'holiday')
      .leftJoinAndSelect('calendar.department', 'department')
      .where('calendar.actualDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('holiday.isActive = :isActive', { isActive: true });

    if (departmentId) {
      query.andWhere(
        '(calendar.departmentId = :departmentId OR calendar.departmentId IS NULL)',
        { departmentId },
      );
    } else {
      query.andWhere('calendar.departmentId IS NULL');
    }

    return query.orderBy('calendar.actualDate', 'ASC').getMany();
  }

  /**
   * Find calendar entries by specific date
   */
  async findByDate(date: Date, departmentId?: string): Promise<HolidayCalendar[]> {
    const query = this.createQueryBuilder('calendar')
      .leftJoinAndSelect('calendar.holiday', 'holiday')
      .leftJoinAndSelect('calendar.department', 'department')
      .where('calendar.actualDate = :date', { date })
      .andWhere('holiday.isActive = :isActive', { isActive: true });

    if (departmentId) {
      query.andWhere(
        '(calendar.departmentId = :departmentId OR calendar.departmentId IS NULL)',
        { departmentId },
      );
    } else {
      query.andWhere('calendar.departmentId IS NULL');
    }

    return query.getMany();
  }

  /**
   * Check if calendar entries exist for a specific year
   */
  async existsForYear(year: number): Promise<boolean> {
    const count = await this.count({ where: { year } });
    return count > 0;
  }

  /**
   * Delete calendar entries for a specific year
   */
  async deleteByYear(year: number): Promise<void> {
    await this.delete({ year });
  }

  /**
   * Check if a specific date is a holiday in the calendar
   */
  async isHolidayDate(date: Date, departmentId?: string): Promise<boolean> {
    const calendars = await this.findByDate(date, departmentId);
    return calendars.length > 0;
  }
}
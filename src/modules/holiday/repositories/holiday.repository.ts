import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between } from 'typeorm';
import { Holiday, HolidayType } from '../entities/holiday.entity';

/**
 * Holiday Repository - Handles database operations for holidays
 * Provides methods for CRUD operations and holiday-specific queries
 * Supports filtering by type, department, and date ranges
 */
@Injectable()
export class HolidayRepository extends Repository<Holiday> {
  constructor(private dataSource: DataSource) {
    super(Holiday, dataSource.createEntityManager());
  }

  /**
   * Find holidays by date range with optional department filtering
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    departmentId?: string,
  ): Promise<Holiday[]> {
    const query = this.createQueryBuilder('holiday')
      .leftJoinAndSelect('holiday.department', 'department')
      .where('holiday.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('holiday.isActive = :isActive', { isActive: true });

    if (departmentId) {
      query.andWhere(
        '(holiday.departmentId = :departmentId OR holiday.type IN (:...globalTypes))',
        {
          departmentId,
          globalTypes: [HolidayType.NATIONAL, HolidayType.COMPANY],
        },
      );
    } else {
      query.andWhere('holiday.type IN (:...globalTypes)', {
        globalTypes: [HolidayType.NATIONAL, HolidayType.COMPANY],
      });
    }

    return query.orderBy('holiday.date', 'ASC').getMany();
  }

  /**
   * Find holidays by specific date
   */
  async findByDate(date: Date, departmentId?: string): Promise<Holiday[]> {
    const query = this.createQueryBuilder('holiday')
      .leftJoinAndSelect('holiday.department', 'department')
      .where('holiday.date = :date', { date })
      .andWhere('holiday.isActive = :isActive', { isActive: true });

    if (departmentId) {
      query.andWhere(
        '(holiday.departmentId = :departmentId OR holiday.type IN (:...globalTypes))',
        {
          departmentId,
          globalTypes: [HolidayType.NATIONAL, HolidayType.COMPANY],
        },
      );
    } else {
      query.andWhere('holiday.type IN (:...globalTypes)', {
        globalTypes: [HolidayType.NATIONAL, HolidayType.COMPANY],
      });
    }

    return query.getMany();
  }

  /**
   * Find holidays by type
   */
  async findByType(type: HolidayType): Promise<Holiday[]> {
    return this.find({
      where: { type, isActive: true },
      relations: ['department'],
      order: { date: 'ASC' },
    });
  }

  /**
   * Find holidays by department
   */
  async findByDepartment(departmentId: string): Promise<Holiday[]> {
    return this.find({
      where: { departmentId, isActive: true },
      relations: ['department'],
      order: { date: 'ASC' },
    });
  }

  /**
   * Find recurring holidays for calendar generation
   */
  async findRecurringHolidays(): Promise<Holiday[]> {
    return this.createQueryBuilder('holiday')
      .leftJoinAndSelect('holiday.department', 'department')
      .where('holiday.recurrence != :none', { none: 'NONE' })
      .andWhere('holiday.isActive = :isActive', { isActive: true })
      .getMany();
  }

  /**
   * Check if a specific date is a holiday
   */
  async isHoliday(date: Date, departmentId?: string): Promise<boolean> {
    const holidays = await this.findByDate(date, departmentId);
    return holidays.length > 0;
  }
}
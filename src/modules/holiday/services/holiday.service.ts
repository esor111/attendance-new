import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { HolidayRepository } from '../repositories/holiday.repository';
import { CreateHolidayDto } from '../dto/create-holiday.dto';
import { UpdateHolidayDto } from '../dto/update-holiday.dto';
import { HolidayQueryDto } from '../dto/holiday-query.dto';
import { Holiday, HolidayType } from '../entities/holiday.entity';

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
   * Check if a specific date is a holiday
   */
  async isHoliday(date: Date, departmentId?: string): Promise<boolean> {
    return this.holidayRepository.isHoliday(date, departmentId);
  }

  /**
   * Get holidays for a specific date
   */
  async getHolidaysByDate(date: Date, departmentId?: string): Promise<Holiday[]> {
    return this.holidayRepository.findByDate(date, departmentId);
  }

  /**
   * Validate holiday conflicts
   */
  private async validateHolidayConflicts(
    date: Date,
    type: HolidayType,
    departmentId?: string,
    excludeId?: string,
  ): Promise<void> {
    const existingHolidays = await this.holidayRepository.findByDate(date, departmentId);

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
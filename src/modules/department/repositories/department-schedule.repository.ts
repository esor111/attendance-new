import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepartmentSchedule } from '../entities/department-schedule.entity';

/**
 * Department Schedule Repository - Data access layer for department schedules
 * Provides CRUD operations and specialized queries for schedule management
 */
@Injectable()
export class DepartmentScheduleRepository {
  constructor(
    @InjectRepository(DepartmentSchedule)
    private readonly repository: Repository<DepartmentSchedule>,
  ) {}

  /**
   * Create a new department schedule
   */
  async create(data: Partial<DepartmentSchedule>): Promise<DepartmentSchedule> {
    const schedule = this.repository.create(data);
    return await this.repository.save(schedule);
  }

  /**
   * Find department schedule by ID
   */
  async findById(id: string): Promise<DepartmentSchedule | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['department'],
    });
  }

  /**
   * Find active schedule for a department
   */
  async findByDepartmentId(departmentId: string): Promise<DepartmentSchedule | null> {
    return await this.repository.findOne({
      where: { 
        departmentId,
        isActive: true,
      },
      relations: ['department'],
    });
  }

  /**
   * Find all schedules for a department (including inactive)
   */
  async findAllByDepartmentId(departmentId: string): Promise<DepartmentSchedule[]> {
    return await this.repository.find({
      where: { departmentId },
      relations: ['department'],
      order: { isActive: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Update department schedule
   */
  async update(id: string, data: Partial<DepartmentSchedule>): Promise<DepartmentSchedule> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated department schedule');
    }
    return updated;
  }

  /**
   * Delete department schedule
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Check if department has an active schedule
   */
  async hasActiveSchedule(departmentId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        departmentId,
        isActive: true,
      },
    });
    return count > 0;
  }

  /**
   * Deactivate all schedules for a department
   */
  async deactivateAllForDepartment(departmentId: string): Promise<void> {
    await this.repository.update(
      { departmentId },
      { isActive: false }
    );
  }

  /**
   * Get all active department schedules
   */
  async findAllActive(): Promise<DepartmentSchedule[]> {
    return await this.repository.find({
      where: { isActive: true },
      relations: ['department'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Check if time is within schedule
   */
  isTimeWithinSchedule(schedule: DepartmentSchedule, time: Date): boolean {
    const timeString = time.toTimeString().substring(0, 8); // "HH:MM:SS"
    const dayOfWeek = time.getDay(); // 0=Sunday, 1=Monday, etc.

    // Check if it's a work day
    if (!schedule.workDays.includes(dayOfWeek)) {
      return false;
    }

    // Check if time is within working hours
    return timeString >= schedule.startTime && timeString <= schedule.endTime;
  }

  /**
   * Get schedule compliance for a time
   */
  getScheduleCompliance(schedule: DepartmentSchedule, time: Date): {
    isWithinSchedule: boolean;
    isWorkDay: boolean;
    isWithinHours: boolean;
    message?: string;
  } {
    const timeString = time.toTimeString().substring(0, 8);
    const dayOfWeek = time.getDay();
    const isWorkDay = schedule.workDays.includes(dayOfWeek);
    const isWithinHours = timeString >= schedule.startTime && timeString <= schedule.endTime;
    const isWithinSchedule = isWorkDay && isWithinHours;

    let message: string | undefined;
    if (!isWorkDay) {
      message = `${this.getDayName(dayOfWeek)} is not a work day for this department`;
    } else if (!isWithinHours) {
      message = `Time ${timeString.substring(0, 5)} is outside working hours (${schedule.startTime.substring(0, 5)} - ${schedule.endTime.substring(0, 5)})`;
    }

    return {
      isWithinSchedule,
      isWorkDay,
      isWithinHours,
      message,
    };
  }

  /**
   * Helper method to get day name
   */
  private getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  }
}
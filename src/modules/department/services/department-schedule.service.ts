import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DepartmentScheduleRepository } from '../repositories/department-schedule.repository';
import { DepartmentRepository } from '../repositories/department.repository';
import { DepartmentSchedule } from '../entities/department-schedule.entity';
import { CreateDepartmentScheduleDto } from '../dto/create-department-schedule.dto';
import { UpdateDepartmentScheduleDto } from '../dto/update-department-schedule.dto';

/**
 * Department Schedule Service - Business logic for department schedule management
 * Handles creation, updates, and validation of department working hours
 * Provides schedule compliance checking for attendance validation
 */
@Injectable()
export class DepartmentScheduleService {
  constructor(
    private readonly departmentScheduleRepository: DepartmentScheduleRepository,
    private readonly departmentRepository: DepartmentRepository,
  ) {}

  /**
   * Create a new department schedule
   */
  async createSchedule(departmentId: string, dto: CreateDepartmentScheduleDto): Promise<DepartmentSchedule> {
    // Verify department exists
    const department = await this.departmentRepository.findById(departmentId);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Validate time format and logic
    this.validateTimeRange(dto.startTime, dto.endTime);
    this.validateWorkDays(dto.workDays);

    // Convert time format from HH:MM to HH:MM:SS
    const startTime = this.formatTimeString(dto.startTime);
    const endTime = this.formatTimeString(dto.endTime);

    // Check if department already has an active schedule
    const existingSchedule = await this.departmentScheduleRepository.findByDepartmentId(departmentId);
    if (existingSchedule && dto.isActive !== false) {
      // Deactivate existing schedule if creating a new active one
      await this.departmentScheduleRepository.deactivateAllForDepartment(departmentId);
    }

    const scheduleData: Partial<DepartmentSchedule> = {
      departmentId,
      name: dto.name,
      startTime,
      endTime,
      workDays: dto.workDays,
      isActive: dto.isActive ?? true,
      description: dto.description,
    };

    return await this.departmentScheduleRepository.create(scheduleData);
  }

  /**
   * Get department schedule by department ID
   */
  async getDepartmentSchedule(departmentId: string): Promise<DepartmentSchedule | null> {
    return await this.departmentScheduleRepository.findByDepartmentId(departmentId);
  }

  /**
   * Get schedule by ID
   */
  async getScheduleById(scheduleId: string): Promise<DepartmentSchedule> {
    const schedule = await this.departmentScheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new NotFoundException('Department schedule not found');
    }
    return schedule;
  }

  /**
   * Update department schedule
   */
  async updateSchedule(scheduleId: string, dto: UpdateDepartmentScheduleDto): Promise<DepartmentSchedule> {
    const existingSchedule = await this.getScheduleById(scheduleId);

    // Validate updates if provided
    if (dto.startTime && dto.endTime) {
      this.validateTimeRange(dto.startTime, dto.endTime);
    } else if (dto.startTime) {
      this.validateTimeRange(dto.startTime, existingSchedule.endTime.substring(0, 5));
    } else if (dto.endTime) {
      this.validateTimeRange(existingSchedule.startTime.substring(0, 5), dto.endTime);
    }

    if (dto.workDays) {
      this.validateWorkDays(dto.workDays);
    }

    const updateData: Partial<DepartmentSchedule> = {};

    if (dto.name) updateData.name = dto.name;
    if (dto.startTime) updateData.startTime = this.formatTimeString(dto.startTime);
    if (dto.endTime) updateData.endTime = this.formatTimeString(dto.endTime);
    if (dto.workDays) updateData.workDays = dto.workDays;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.description !== undefined) updateData.description = dto.description;

    // If activating this schedule, deactivate others for the same department
    if (dto.isActive === true) {
      await this.departmentScheduleRepository.deactivateAllForDepartment(existingSchedule.departmentId);
    }

    return await this.departmentScheduleRepository.update(scheduleId, updateData);
  }

  /**
   * Delete department schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    const schedule = await this.getScheduleById(scheduleId);
    await this.departmentScheduleRepository.delete(scheduleId);
  }

  /**
   * Get all schedules for a department
   */
  async getDepartmentSchedules(departmentId: string): Promise<DepartmentSchedule[]> {
    return await this.departmentScheduleRepository.findAllByDepartmentId(departmentId);
  }

  /**
   * Check if time is within department schedule
   */
  async validateAttendanceTime(departmentId: string, time: Date): Promise<{
    isValid: boolean;
    schedule?: DepartmentSchedule;
    compliance?: {
      isWithinSchedule: boolean;
      isWorkDay: boolean;
      isWithinHours: boolean;
      message?: string;
    };
  }> {
    const schedule = await this.getDepartmentSchedule(departmentId);
    
    if (!schedule) {
      return {
        isValid: true, // No schedule means no restrictions
      };
    }

    const compliance = this.departmentScheduleRepository.getScheduleCompliance(schedule, time);

    return {
      isValid: compliance.isWithinSchedule,
      schedule,
      compliance,
    };
  }

  /**
   * Get user's department schedule
   */
  async getUserDepartmentSchedule(userId: string): Promise<DepartmentSchedule | null> {
    // This would need to be implemented with user service integration
    // For now, return null - will be implemented when integrating with attendance service
    return null;
  }

  /**
   * Get all active schedules
   */
  async getAllActiveSchedules(): Promise<DepartmentSchedule[]> {
    return await this.departmentScheduleRepository.findAllActive();
  }

  /**
   * Validate time range
   */
  private validateTimeRange(startTime: string, endTime: string): void {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timeRegex.test(startTime)) {
      throw new BadRequestException('Start time must be in HH:MM format (e.g., 09:00)');
    }
    
    if (!timeRegex.test(endTime)) {
      throw new BadRequestException('End time must be in HH:MM format (e.g., 18:00)');
    }

    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    if (start >= end) {
      throw new BadRequestException('End time must be after start time');
    }

    // Reasonable working hours validation (4-16 hours)
    const duration = end - start;
    if (duration < 240) { // Less than 4 hours
      throw new BadRequestException('Working hours must be at least 4 hours');
    }
    if (duration > 960) { // More than 16 hours
      throw new BadRequestException('Working hours cannot exceed 16 hours');
    }
  }

  /**
   * Validate work days array
   */
  private validateWorkDays(workDays: number[]): void {
    if (!Array.isArray(workDays) || workDays.length === 0) {
      throw new BadRequestException('At least one work day must be specified');
    }

    if (workDays.length > 7) {
      throw new BadRequestException('Cannot have more than 7 work days');
    }

    // Check if all values are valid day numbers (0-6)
    const validDays = workDays.every(day => Number.isInteger(day) && day >= 0 && day <= 6);
    if (!validDays) {
      throw new BadRequestException('Work days must be numbers between 0 (Sunday) and 6 (Saturday)');
    }

    // Check for duplicates
    const uniqueDays = [...new Set(workDays)];
    if (uniqueDays.length !== workDays.length) {
      throw new BadRequestException('Work days cannot contain duplicates');
    }
  }

  /**
   * Convert time string to minutes for comparison
   */
  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Format time string to HH:MM:SS format
   */
  private formatTimeString(timeString: string): string {
    // If already in HH:MM:SS format, return as is
    if (timeString.length === 8 && timeString.split(':').length === 3) {
      return timeString;
    }
    
    // Convert HH:MM to HH:MM:SS
    return `${timeString}:00`;
  }

  /**
   * Get formatted schedule info for display
   */
  getScheduleDisplayInfo(schedule: DepartmentSchedule): {
    workingHours: string;
    workDaysText: string;
    isActive: boolean;
  } {
    const startTime = schedule.startTime.substring(0, 5); // Remove seconds
    const endTime = schedule.endTime.substring(0, 5);
    const workingHours = `${startTime} - ${endTime}`;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const workDaysText = schedule.workDays
      .sort()
      .map(day => dayNames[day])
      .join(', ');

    return {
      workingHours,
      workDaysText,
      isActive: schedule.isActive,
    };
  }
}
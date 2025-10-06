import { Controller, Get, UseGuards } from '@nestjs/common';
import { DepartmentScheduleService } from '../../department/services/department-schedule.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

/**
 * User Schedule Controller - Endpoints for users to view their department schedule
 * Provides read-only access to department working hours for employees
 */
@Controller('api/attendance')
@UseGuards(JwtAuthGuard)
export class UserScheduleController {
  constructor(
    private readonly departmentScheduleService: DepartmentScheduleService,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Get my department schedule - User views their department's working hours
   */
  @Get('my-schedule')
  async getMySchedule(@CurrentUser() user: any) {
    // Get user details to find their department
    const userDetails = await this.userRepository.findById(user.id);
    
    if (!userDetails || !userDetails.departmentId) {
      return {
        message: 'You are not assigned to any department',
        schedule: null,
        department: null,
      };
    }

    // Get department schedule
    const schedule = await this.departmentScheduleService.getDepartmentSchedule(userDetails.departmentId);
    
    if (!schedule) {
      return {
        message: 'Your department does not have a working schedule configured',
        schedule: null,
        department: {
          id: userDetails.departmentId,
          name: userDetails.department?.name || 'Unknown Department',
        },
      };
    }

    const displayInfo = this.departmentScheduleService.getScheduleDisplayInfo(schedule);
    
    return {
      message: 'Your department working schedule',
      schedule: {
        ...schedule,
        displayInfo,
      },
      department: {
        id: userDetails.departmentId,
        name: userDetails.department?.name || 'Unknown Department',
      },
    };
  }

  /**
   * Check if current time is within my department's working hours
   */
  @Get('schedule/check-now')
  async checkCurrentTime(@CurrentUser() user: any) {
    const userDetails = await this.userRepository.findById(user.id);
    
    if (!userDetails || !userDetails.departmentId) {
      return {
        message: 'You are not assigned to any department',
        isWithinSchedule: true, // No restrictions if no department
        currentTime: new Date().toISOString(),
      };
    }

    const currentTime = new Date();
    const validation = await this.departmentScheduleService.validateAttendanceTime(
      userDetails.departmentId, 
      currentTime
    );
    
    return {
      message: validation.isValid 
        ? 'Current time is within your department working hours'
        : 'Current time is outside your department working hours',
      isWithinSchedule: validation.isValid,
      currentTime: currentTime.toISOString(),
      schedule: validation.schedule ? {
        ...validation.schedule,
        displayInfo: this.departmentScheduleService.getScheduleDisplayInfo(validation.schedule),
      } : null,
      compliance: validation.compliance,
      department: {
        id: userDetails.departmentId,
        name: userDetails.department?.name || 'Unknown Department',
      },
    };
  }
}
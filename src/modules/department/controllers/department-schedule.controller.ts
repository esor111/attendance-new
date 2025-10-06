import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete,
  Body, 
  Param, 
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { DepartmentScheduleService } from '../services/department-schedule.service';
import { CreateDepartmentScheduleDto } from '../dto/create-department-schedule.dto';
import { UpdateDepartmentScheduleDto } from '../dto/update-department-schedule.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

/**
 * Department Schedule Controller - HTTP endpoints for department schedule management
 * Provides endpoints for creating, updating, and retrieving department working hours
 * All endpoints require JWT authentication
 */
@Controller('api/departments')
@UseGuards(JwtAuthGuard)
export class DepartmentScheduleController {
  constructor(private readonly departmentScheduleService: DepartmentScheduleService) {}

  /**
   * Create department schedule - Admin creates working hours for department
   */
  @Post(':id/schedule')
  async createSchedule(
    @Param('id', ParseUUIDPipe) departmentId: string,
    @Body() createScheduleDto: CreateDepartmentScheduleDto,
  ) {
    const schedule = await this.departmentScheduleService.createSchedule(departmentId, createScheduleDto);
    const displayInfo = this.departmentScheduleService.getScheduleDisplayInfo(schedule);
    
    return {
      ...schedule,
      displayInfo,
    };
  }

  /**
   * Get department schedule - Retrieve active schedule for department
   */
  @Get(':id/schedule')
  async getDepartmentSchedule(
    @Param('id', ParseUUIDPipe) departmentId: string,
  ) {
    const schedule = await this.departmentScheduleService.getDepartmentSchedule(departmentId);
    
    if (!schedule) {
      return {
        message: 'No active schedule found for this department',
        schedule: null,
      };
    }

    const displayInfo = this.departmentScheduleService.getScheduleDisplayInfo(schedule);
    
    return {
      ...schedule,
      displayInfo,
    };
  }

  /**
   * Update department schedule - Modify existing schedule
   */
  @Put(':id/schedule')
  async updateDepartmentSchedule(
    @Param('id', ParseUUIDPipe) departmentId: string,
    @Body() updateScheduleDto: UpdateDepartmentScheduleDto,
  ) {
    // Get current active schedule for the department
    const currentSchedule = await this.departmentScheduleService.getDepartmentSchedule(departmentId);
    
    if (!currentSchedule) {
      return {
        message: 'No active schedule found for this department. Please create a schedule first.',
        schedule: null,
      };
    }

    const updatedSchedule = await this.departmentScheduleService.updateSchedule(
      currentSchedule.id, 
      updateScheduleDto
    );
    
    const displayInfo = this.departmentScheduleService.getScheduleDisplayInfo(updatedSchedule);
    
    return {
      ...updatedSchedule,
      displayInfo,
    };
  }

  /**
   * Get all schedules for department - Including inactive ones
   */
  @Get(':id/schedules')
  async getDepartmentSchedules(
    @Param('id', ParseUUIDPipe) departmentId: string,
  ) {
    const schedules = await this.departmentScheduleService.getDepartmentSchedules(departmentId);
    
    return schedules.map(schedule => ({
      ...schedule,
      displayInfo: this.departmentScheduleService.getScheduleDisplayInfo(schedule),
    }));
  }

  /**
   * Delete department schedule
   */
  @Delete('schedule/:scheduleId')
  async deleteSchedule(
    @Param('scheduleId', ParseUUIDPipe) scheduleId: string,
  ) {
    await this.departmentScheduleService.deleteSchedule(scheduleId);
    return { message: 'Department schedule deleted successfully' };
  }

  /**
   * Get all active department schedules - Admin overview
   */
  @Get('schedules/active')
  async getAllActiveSchedules() {
    const schedules = await this.departmentScheduleService.getAllActiveSchedules();
    
    return schedules.map(schedule => ({
      ...schedule,
      displayInfo: this.departmentScheduleService.getScheduleDisplayInfo(schedule),
    }));
  }

  /**
   * Validate attendance time against department schedule
   */
  @Post(':id/schedule/validate')
  async validateAttendanceTime(
    @Param('id', ParseUUIDPipe) departmentId: string,
    @Body() body: { time: string }, // ISO string
  ) {
    const time = new Date(body.time);
    const validation = await this.departmentScheduleService.validateAttendanceTime(departmentId, time);
    
    return {
      isValid: validation.isValid,
      time: time.toISOString(),
      schedule: validation.schedule ? {
        ...validation.schedule,
        displayInfo: this.departmentScheduleService.getScheduleDisplayInfo(validation.schedule),
      } : null,
      compliance: validation.compliance,
    };
  }
}
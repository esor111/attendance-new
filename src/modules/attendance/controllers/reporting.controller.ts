import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ReportingService } from '../services/reporting.service';
import { CreateReportingStructureDto } from '../dto/create-reporting-structure.dto';
import { UpdateReportingStructureDto } from '../dto/update-reporting-structure.dto';

/**
 * Reporting Controller - Handles team reporting and manager access functionality
 * Provides endpoints for managing reporting structures and accessing team attendance data
 * Validates manager permissions and prevents circular reporting relationships
 */
@ApiTags('Team Reporting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  /**
   * Create a new reporting relationship
   */
  @Post('structure')
  @ApiOperation({
    summary: 'Create reporting relationship',
    description: 'Create a new employee-manager reporting relationship with validation',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully created reporting relationship',
    schema: {
      example: {
        id: 'reporting-uuid',
        employeeId: 'employee-uuid',
        managerId: 'manager-uuid',
        startDate: '2025-10-05',
        endDate: null,
        createdAt: '2025-10-05T09:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid data or circular relationship detected' })
  async createReportingStructure(@Body() dto: CreateReportingStructureDto) {
    return await this.reportingService.createReportingStructure(dto);
  }

  /**
   * Update an existing reporting relationship
   */
  @Put('structure/:id')
  @ApiOperation({
    summary: 'Update reporting relationship',
    description: 'Update an existing employee-manager reporting relationship',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully updated reporting relationship',
  })
  @ApiResponse({ status: 400, description: 'Invalid data or relationship not found' })
  async updateReportingStructure(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportingStructureDto,
  ) {
    return await this.reportingService.updateReportingStructure(id, dto);
  }

  /**
   * End a reporting relationship
   */
  @Put('structure/:id/end')
  @ApiOperation({
    summary: 'End reporting relationship',
    description: 'End a reporting relationship by setting an end date',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully ended reporting relationship',
  })
  async endReportingStructure(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('endDate') endDate: string,
  ) {
    return await this.reportingService.endReportingStructure(id, new Date(endDate));
  }

  /**
   * Get team members for a manager
   */
  @Get('team/members')
  @ApiOperation({
    summary: 'Get team members',
    description: 'Get all current team members for the authenticated manager',
  })
  @ApiResponse({
    status: 200,
    description: 'List of team members',
    schema: {
      example: [
        {
          id: 'reporting-uuid',
          employeeId: 'employee-uuid',
          startDate: '2025-10-01',
          employee: {
            id: 'employee-uuid',
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
      ],
    },
  })
  async getTeamMembers(@Request() req: any) {
    return await this.reportingService.getTeamMembers(req.user.userId);
  }

  /**
   * Get team attendance summary
   */
  @Get('team/attendance/summary')
  @ApiOperation({
    summary: 'Get team attendance summary',
    description: 'Get attendance summary with statistics for all team members',
  })
  @ApiQuery({ name: 'startDate', type: String, example: '2025-10-01' })
  @ApiQuery({ name: 'endDate', type: String, example: '2025-10-31' })
  @ApiResponse({
    status: 200,
    description: 'Team attendance summary with statistics',
    schema: {
      example: {
        teamMembers: [
          {
            id: 'attendance-uuid',
            userId: 'user-uuid',
            date: '2025-10-05',
            clockInTime: '2025-10-05T09:00:00Z',
            status: 'Present',
            user: {
              name: 'John Doe',
              email: 'john@example.com',
            },
          },
        ],
        statistics: {
          totalDays: 30,
          presentDays: 25,
          absentDays: 5,
          lateDays: 2,
          flaggedDays: 1,
        },
        teamMemberStats: [
          {
            userId: 'user-uuid',
            userName: 'John Doe',
            presentDays: 20,
            absentDays: 3,
            lateDays: 1,
            flaggedDays: 0,
            averageHours: 8.2,
          },
        ],
      },
    },
  })
  async getTeamAttendanceSummary(
    @Request() req: any,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
  ) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    return await this.reportingService.getTeamAttendanceSummary(req.user.userId, startDate, endDate);
  }

  /**
   * Get detailed report for a specific team member
   */
  @Get('team/member/:employeeId/detailed')
  @ApiOperation({
    summary: 'Get detailed team member report',
    description: 'Get comprehensive attendance report for a specific team member',
  })
  @ApiQuery({ name: 'startDate', type: String, example: '2025-10-01' })
  @ApiQuery({ name: 'endDate', type: String, example: '2025-10-31' })
  @ApiResponse({
    status: 200,
    description: 'Detailed team member attendance report',
    schema: {
      example: {
        attendance: [
          {
            id: 'attendance-uuid',
            date: '2025-10-05',
            clockInTime: '2025-10-05T09:00:00Z',
            clockOutTime: '2025-10-05T17:30:00Z',
            totalHours: 8.5,
            status: 'Present',
            isFlagged: false,
          },
        ],
        locationLogs: [
          {
            id: 'location-log-uuid',
            placeName: 'Client Site A',
            checkInTime: '2025-10-05T10:30:00Z',
            checkOutTime: '2025-10-05T12:00:00Z',
            visitDurationMinutes: 90,
          },
        ],
        sessions: [
          {
            id: 'session-uuid',
            sessionType: 'break',
            checkInTime: '2025-10-05T11:00:00Z',
            checkOutTime: '2025-10-05T11:15:00Z',
            sessionDurationMinutes: 15,
          },
        ],
        statistics: {
          totalDays: 23,
          presentDays: 20,
          totalHours: 164.5,
          averageHours: 8.2,
          flaggedDays: 0,
          locationVisits: 5,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'No access to this employee\'s data' })
  async getTeamMemberDetailedReport(
    @Request() req: any,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
  ) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    return await this.reportingService.getTeamMemberDetailedReport(
      req.user.userId,
      employeeId,
      startDate,
      endDate,
    );
  }

  /**
   * Get team attendance for a specific date
   */
  @Get('team/attendance/date')
  @ApiOperation({
    summary: 'Get team attendance by date',
    description: 'Get team attendance status for a specific date',
  })
  @ApiQuery({ name: 'date', type: String, example: '2025-10-05' })
  @ApiResponse({
    status: 200,
    description: 'Team attendance for specific date',
    schema: {
      example: {
        date: '2025-10-05',
        teamMembers: [
          {
            userId: 'user-uuid',
            userName: 'John Doe',
            status: 'Present',
            clockInTime: '2025-10-05T09:00:00Z',
            clockOutTime: null,
            totalHours: null,
            isFlagged: false,
            currentLocation: 'ABC Company HQ',
          },
        ],
        summary: {
          total: 5,
          present: 4,
          absent: 1,
          late: 0,
          flagged: 0,
        },
      },
    },
  })
  async getTeamAttendanceByDate(
    @Request() req: any,
    @Query('date') dateStr: string,
  ) {
    const date = new Date(dateStr);
    return await this.reportingService.getTeamAttendanceByDate(req.user.userId, date);
  }

  /**
   * Get reporting chain for an employee
   */
  @Get('chain/:employeeId')
  @ApiOperation({
    summary: 'Get reporting chain',
    description: 'Get the reporting chain (hierarchy) for an employee',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee reporting chain',
    schema: {
      example: [
        {
          id: 'reporting-uuid-1',
          employeeId: 'employee-uuid',
          managerId: 'manager-uuid-1',
          manager: {
            name: 'Direct Manager',
            email: 'manager@example.com',
          },
        },
        {
          id: 'reporting-uuid-2',
          employeeId: 'manager-uuid-1',
          managerId: 'senior-manager-uuid',
          manager: {
            name: 'Senior Manager',
            email: 'senior@example.com',
          },
        },
      ],
    },
  })
  async getReportingChain(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return await this.reportingService.getReportingChain(employeeId);
  }

  /**
   * Get all subordinates for a manager
   */
  @Get('subordinates')
  @ApiOperation({
    summary: 'Get all subordinates',
    description: 'Get all direct and indirect subordinates for the authenticated manager',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all subordinate user IDs',
    schema: {
      example: [
        'employee-uuid-1',
        'employee-uuid-2',
        'employee-uuid-3',
      ],
    },
  })
  async getAllSubordinates(@Request() req: any) {
    return await this.reportingService.getAllSubordinates(req.user.userId);
  }

  /**
   * Validate manager access to employee
   */
  @Get('access/:employeeId')
  @ApiOperation({
    summary: 'Validate manager access',
    description: 'Check if the authenticated manager has access to a specific employee\'s data',
  })
  @ApiResponse({
    status: 200,
    description: 'Access validation result',
    schema: {
      example: {
        hasAccess: true,
        employeeId: 'employee-uuid',
        managerId: 'manager-uuid',
      },
    },
  })
  async validateManagerAccess(
    @Request() req: any,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    const hasAccess = await this.reportingService.validateManagerAccess(req.user.userId, employeeId);
    return {
      hasAccess,
      employeeId,
      managerId: req.user.userId,
    };
  }
}
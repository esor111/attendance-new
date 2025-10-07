import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { LeaveService } from '../services/leave.service';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { ApproveLeaveRequestDto } from '../dto/approve-leave-request.dto';

/**
 * Simplified Leave Controller - Handles all leave management HTTP requests
 * Uses consolidated LeaveService for all leave operations
 * Eliminates complex service dependencies and reduces maintenance overhead
 */
@ApiTags('Leave Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/leave')
export class LeaveController {
  constructor(
    private readonly leaveService: LeaveService,
  ) {}

  /**
   * Submit a new leave request
   */
  @Post('request')
  @ApiOperation({
    summary: 'Submit a new leave request',
    description: 'Create a new leave request with validation and balance checks',
  })
  @ApiResponse({
    status: 201,
    description: 'Leave request created successfully',
    schema: {
      example: {
        id: 'leave-request-uuid',
        userId: 'user-uuid',
        leaveTypeId: 'leave-type-uuid',
        startDate: '2025-10-15',
        endDate: '2025-10-17',
        daysRequested: 3,
        reason: 'Family vacation',
        status: 'PENDING',
        isEmergency: false,
        createdAt: '2025-10-05T10:00:00Z',
        leaveType: {
          id: 'leave-type-uuid',
          name: 'Annual Leave',
          requiresApproval: true,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request data or insufficient balance' })
  async createLeaveRequest(@Request() req: any, @Body() createLeaveRequestDto: CreateLeaveRequestDto) {
    return await this.leaveService.createLeaveRequest(req.user.userId, createLeaveRequestDto);
  }

  /**
   * Get user's leave request history
   */
  @Get('requests')
  @ApiOperation({
    summary: 'Get user leave request history',
    description: 'Retrieve all leave requests for the authenticated user',
  })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'User leave request history',
    schema: {
      example: [
        {
          id: 'leave-request-uuid-1',
          startDate: '2025-10-15',
          endDate: '2025-10-17',
          daysRequested: 3,
          status: 'APPROVED',
          leaveType: {
            name: 'Annual Leave',
          },
          approver: {
            name: 'John Manager',
            email: 'john.manager@company.com',
          },
          approvedAt: '2025-10-06T14:30:00Z',
        },
      ],
    },
  })
  async getUserLeaveRequests(
    @Request() req: any,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return await this.leaveService.getUserLeaveRequests(req.user.userId, limit);
  }

  /**
   * Get specific leave request details
   */
  @Get('requests/:id')
  @ApiOperation({
    summary: 'Get leave request details',
    description: 'Retrieve details of a specific leave request',
  })
  @ApiResponse({
    status: 200,
    description: 'Leave request details',
    schema: {
      example: {
        id: 'leave-request-uuid',
        userId: 'user-uuid',
        startDate: '2025-10-15',
        endDate: '2025-10-17',
        daysRequested: 3,
        reason: 'Family vacation',
        status: 'PENDING',
        user: {
          name: 'Jane Doe',
          email: 'jane.doe@company.com',
        },
        leaveType: {
          name: 'Annual Leave',
          requiresApproval: true,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @ApiResponse({ status: 403, description: 'Access denied to this leave request' })
  async getLeaveRequestById(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) requestId: string,
  ) {
    return await this.leaveService.getLeaveRequestById(requestId, req.user.userId);
  }

  /**
   * Cancel a leave request
   */
  @Post('requests/:id/cancel')
  @ApiOperation({
    summary: 'Cancel a leave request',
    description: 'Cancel a pending or approved leave request',
  })
  @ApiResponse({
    status: 200,
    description: 'Leave request cancelled successfully',
    schema: {
      example: {
        id: 'leave-request-uuid',
        status: 'CANCELLED',
        updatedAt: '2025-10-05T15:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Cannot cancel this leave request' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  async cancelLeaveRequest(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) requestId: string,
  ) {
    return await this.leaveService.cancelLeaveRequest(requestId, req.user.userId);
  }

  /**
   * Approve or reject a leave request (managers only)
   */
  @Post('approve/:id')
  @ApiOperation({
    summary: 'Approve or reject a leave request',
    description: 'Manager approval action for team member leave requests',
  })
  @ApiResponse({
    status: 200,
    description: 'Leave request processed successfully',
    schema: {
      example: {
        id: 'leave-request-uuid',
        status: 'APPROVED',
        approverId: 'manager-uuid',
        approvedAt: '2025-10-05T16:00:00Z',
        approvalComments: 'Approved for family vacation',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid approval action' })
  @ApiResponse({ status: 403, description: 'No permission to approve this request' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  async approveLeaveRequest(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) requestId: string,
    @Body() approveLeaveRequestDto: ApproveLeaveRequestDto,
  ) {
    return await this.leaveService.approveLeaveRequest(
      requestId,
      req.user.userId,
      approveLeaveRequestDto,
    );
  }

  /**
   * Get team leave requests for managers
   */
  @Get('team-requests')
  @ApiOperation({
    summary: 'Get team leave requests',
    description: 'Retrieve leave requests for team members (managers only)',
  })
  @ApiQuery({ name: 'startDate', type: String, required: false, example: '2025-10-01' })
  @ApiQuery({ name: 'endDate', type: String, required: false, example: '2025-10-31' })
  @ApiResponse({
    status: 200,
    description: 'Team leave requests',
    schema: {
      example: [
        {
          id: 'leave-request-uuid',
          user: {
            name: 'Jane Doe',
            email: 'jane.doe@company.com',
          },
          leaveType: {
            name: 'Annual Leave',
          },
          startDate: '2025-10-15',
          endDate: '2025-10-17',
          daysRequested: 3,
          status: 'PENDING',
          reason: 'Family vacation',
        },
      ],
    },
  })
  async getTeamLeaveRequests(
    @Request() req: any,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;
    
    return await this.leaveService.getTeamLeaveRequests(req.user.userId, startDate, endDate);
  }

  /**
   * Get user's leave balances
   */
  @Get('balance')
  @ApiOperation({
    summary: 'Get user leave balances',
    description: 'Retrieve current leave balances for the authenticated user',
  })
  @ApiQuery({ name: 'year', type: Number, required: false, example: 2025 })
  @ApiResponse({
    status: 200,
    description: 'User leave balances',
    schema: {
      example: [
        {
          leaveType: {
            type: 'ANNUAL',
            name: 'Annual Leave',
            maxDaysPerYear: 25,
            requiresApproval: true,
          },
          year: 2025,
          allocatedDays: 25,
          usedDays: 8,
          remainingDays: 17,
          totalAvailableDays: 25,
        },
        {
          leaveType: {
            type: 'SICK',
            name: 'Sick Leave',
            maxDaysPerYear: 10,
            requiresApproval: false,
          },
          year: 2025,
          allocatedDays: 10,
          usedDays: 2,
          remainingDays: 8,
          totalAvailableDays: 10,
        },
      ],
    },
  })
  async getUserLeaveBalances(
    @Request() req: any,
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe) year: number,
  ) {
    return await this.leaveService.getUserLeaveBalances(req.user.userId, year);
  }

  /**
   * Get leave statistics for user
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Get leave statistics',
    description: 'Retrieve leave usage statistics for the authenticated user',
  })
  @ApiQuery({ name: 'year', type: Number, required: false, example: 2025 })
  @ApiResponse({
    status: 200,
    description: 'Leave statistics',
    schema: {
      example: {
        requests: {
          pending: { count: 1, totalDays: 3 },
          approved: { count: 5, totalDays: 15 },
          rejected: { count: 0, totalDays: 0 },
        },
        balances: [
          {
            leaveType: 'Annual Leave',
            allocated: 25,
            used: 15,
            pending: 3,
            remaining: 7,
          },
        ],
      },
    },
  })
  async getLeaveStatistics(
    @Request() req: any,
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe) year: number,
  ) {
    return await this.leaveService.getLeaveStatistics(req.user.userId, year);
  }

  /**
   * Get pending approvals for managers
   */
  @Get('pending-approvals')
  @ApiOperation({
    summary: 'Get pending approvals',
    description: 'Retrieve leave requests pending approval for the manager',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending leave approvals',
    schema: {
      example: [
        {
          id: 'leave-request-uuid',
          user: {
            name: 'Jane Doe',
            email: 'jane.doe@company.com',
          },
          leaveType: 'ANNUAL',
          startDate: '2025-10-15',
          endDate: '2025-10-17',
          daysRequested: 3,
          reason: 'Family vacation',
          createdAt: '2025-10-05T10:00:00Z',
        },
      ],
    },
  })
  async getPendingApprovals(@Request() req: any) {
    return await this.leaveService.getPendingTeamRequests(req.user.userId);
  }
}
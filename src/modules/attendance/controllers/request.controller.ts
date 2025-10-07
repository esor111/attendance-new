import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  ParseUUIDPipe,
  ParseEnumPipe,
  DefaultValuePipe,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { RequestService } from '../services/request.service';
import { RequestType, RequestStatus } from '../entities/request.entity';
import { 
  CreateAnyRequestDto,
  CreateLeaveRequestDto,
  CreateRemoteWorkRequestDto,
  CreateAttendanceCorrectionRequestDto,
} from '../dto/create-request.dto';
import { ApproveRequestDto } from '../dto/approve-request.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

/**
 * Unified Request Controller - HTTP endpoints for all request types
 * Consolidates AttendanceRequestController, RemoteWorkController, and LeaveController
 * Provides unified API endpoints with type-based routing
 */
@ApiTags('Unified Request Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/requests')
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  /**
   * Create a new request of any type
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new request',
    description: 'Create a new request of any type (leave, remote work, attendance correction)',
  })
  @ApiResponse({
    status: 201,
    description: 'Request created successfully',
    schema: {
      example: {
        id: 'request-uuid',
        userId: 'user-uuid',
        type: 'LEAVE',
        status: 'PENDING',
        requestData: {
          leaveType: 'ANNUAL',
          startDate: '2025-10-15',
          endDate: '2025-10-17',
          daysRequested: 3,
          reason: 'Family vacation',
        },
        createdAt: '2025-10-05T10:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 409, description: 'Conflicting request exists' })
  async createRequest(
    @CurrentUser() user: any,
    @Body() createRequestDto: CreateAnyRequestDto,
  ) {
    return await this.requestService.createRequest(
      user.id,
      createRequestDto.type,
      createRequestDto.requestData,
      createRequestDto.notes,
    );
  }

  /**
   * Create a leave request (type-specific endpoint for convenience)
   */
  @Post('leave')
  @ApiOperation({
    summary: 'Create a leave request',
    description: 'Create a new leave request with leave-specific validation',
  })
  async createLeaveRequest(
    @CurrentUser() user: any,
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
  ) {
    return await this.requestService.createRequest(
      user.id,
      RequestType.LEAVE,
      createLeaveRequestDto.requestData,
      createLeaveRequestDto.notes,
    );
  }

  /**
   * Create a remote work request (type-specific endpoint for convenience)
   */
  @Post('remote-work')
  @ApiOperation({
    summary: 'Create a remote work request',
    description: 'Create a new remote work request with remote work-specific validation',
  })
  async createRemoteWorkRequest(
    @CurrentUser() user: any,
    @Body() createRemoteWorkRequestDto: CreateRemoteWorkRequestDto,
  ) {
    return await this.requestService.createRequest(
      user.id,
      RequestType.REMOTE_WORK,
      createRemoteWorkRequestDto.requestData,
      createRemoteWorkRequestDto.notes,
    );
  }

  /**
   * Create an attendance correction request (type-specific endpoint for convenience)
   */
  @Post('attendance-correction')
  @ApiOperation({
    summary: 'Create an attendance correction request',
    description: 'Create a new attendance correction request with attendance-specific validation',
  })
  async createAttendanceCorrectionRequest(
    @CurrentUser() user: any,
    @Body() createAttendanceCorrectionRequestDto: CreateAttendanceCorrectionRequestDto,
  ) {
    return await this.requestService.createRequest(
      user.id,
      RequestType.ATTENDANCE_CORRECTION,
      createAttendanceCorrectionRequestDto.requestData,
      createAttendanceCorrectionRequestDto.notes,
    );
  }

  /**
   * Get user's requests with optional filtering
   */
  @Get()
  @ApiOperation({
    summary: 'Get user requests',
    description: 'Retrieve user requests with optional filtering by type, status, and date range',
  })
  @ApiQuery({ name: 'type', enum: RequestType, required: false })
  @ApiQuery({ name: 'status', enum: RequestStatus, required: false })
  @ApiQuery({ name: 'startDate', type: String, required: false, example: '2025-10-01' })
  @ApiQuery({ name: 'endDate', type: String, required: false, example: '2025-10-31' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'User requests retrieved successfully',
    schema: {
      example: [
        {
          id: 'request-uuid',
          type: 'LEAVE',
          status: 'APPROVED',
          requestData: {
            leaveType: 'ANNUAL',
            startDate: '2025-10-15',
            endDate: '2025-10-17',
            daysRequested: 3,
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
  async getUserRequests(
    @CurrentUser() user: any,
    @Query('type') type?: RequestType,
    @Query('status') status?: RequestStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return await this.requestService.getUserRequests(user.id, type, status, start, end, limit);
  }

  /**
   * Get requests by type
   */
  @Get('type/:type')
  @ApiOperation({
    summary: 'Get requests by type',
    description: 'Retrieve user requests filtered by specific type',
  })
  @ApiParam({ name: 'type', enum: RequestType })
  @ApiQuery({ name: 'status', enum: RequestStatus, required: false })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 50 })
  async getRequestsByType(
    @CurrentUser() user: any,
    @Param('type', new ParseEnumPipe(RequestType)) type: RequestType,
    @Query('status') status?: RequestStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return await this.requestService.getUserRequests(user.id, type, status, start, end, limit);
  }

  /**
   * Get specific request by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get request by ID',
    description: 'Retrieve details of a specific request',
  })
  @ApiResponse({
    status: 200,
    description: 'Request details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Request not found' })
  @ApiResponse({ status: 403, description: 'Access denied to this request' })
  async getRequestById(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) requestId: string,
  ) {
    return await this.requestService.getRequestById(requestId, user.id);
  }

  /**
   * Get pending requests for manager approval
   */
  @Get('pending/approval')
  @ApiOperation({
    summary: 'Get pending requests for approval',
    description: 'Retrieve requests pending approval for the manager',
  })
  @ApiQuery({ name: 'type', enum: RequestType, required: false })
  @ApiResponse({
    status: 200,
    description: 'Pending requests retrieved successfully',
    schema: {
      example: [
        {
          id: 'request-uuid',
          type: 'LEAVE',
          user: {
            name: 'Jane Doe',
            email: 'jane.doe@company.com',
          },
          requestData: {
            leaveType: 'ANNUAL',
            startDate: '2025-10-15',
            endDate: '2025-10-17',
            daysRequested: 3,
            reason: 'Family vacation',
          },
          createdAt: '2025-10-05T10:00:00Z',
        },
      ],
    },
  })
  async getPendingRequests(
    @CurrentUser() user: any,
    @Query('type') type?: RequestType,
  ) {
    return await this.requestService.getPendingRequestsForManager(user.id, type);
  }

  /**
   * Get team requests for managers
   */
  @Get('team/all')
  @ApiOperation({
    summary: 'Get team requests',
    description: 'Retrieve requests for team members (managers only)',
  })
  @ApiQuery({ name: 'type', enum: RequestType, required: false })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiResponse({
    status: 200,
    description: 'Team requests retrieved successfully',
  })
  async getTeamRequests(
    @CurrentUser() user: any,
    @Query('type') type?: RequestType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return await this.requestService.getTeamRequests(user.id, type, start, end);
  }

  /**
   * Approve or reject a request
   */
  @Post(':id/approve')
  @ApiOperation({
    summary: 'Approve or reject a request',
    description: 'Manager approval action for team member requests',
  })
  @ApiResponse({
    status: 200,
    description: 'Request processed successfully',
    schema: {
      example: {
        id: 'request-uuid',
        status: 'APPROVED',
        approverId: 'manager-uuid',
        approvedAt: '2025-10-05T16:00:00Z',
        approvalNotes: 'Approved for family vacation',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid approval action' })
  @ApiResponse({ status: 403, description: 'No permission to approve this request' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async approveRequest(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) requestId: string,
    @Body() approveRequestDto: ApproveRequestDto,
  ) {
    return await this.requestService.approveRequest(requestId, user.id, {
      status: approveRequestDto.status,
      notes: approveRequestDto.notes,
      rejectionReason: approveRequestDto.rejectionReason,
    });
  }

  /**
   * Cancel a request
   */
  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel a request',
    description: 'Cancel a pending or approved request',
  })
  @ApiResponse({
    status: 200,
    description: 'Request cancelled successfully',
    schema: {
      example: {
        id: 'request-uuid',
        status: 'CANCELLED',
        updatedAt: '2025-10-05T15:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Cannot cancel this request' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async cancelRequest(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) requestId: string,
  ) {
    return await this.requestService.cancelRequest(requestId, user.id);
  }

  /**
   * Delete a request (only pending requests)
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a request',
    description: 'Delete a pending request (only the requester can delete their own requests)',
  })
  @ApiResponse({
    status: 200,
    description: 'Request deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'Cannot delete this request' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async deleteRequest(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) requestId: string,
  ) {
    // For now, we'll use cancel instead of delete to maintain audit trail
    await this.requestService.cancelRequest(requestId, user.id);
    return { message: 'Request cancelled successfully' };
  }

  /**
   * Get request statistics
   */
  @Get('stats/summary')
  @ApiOperation({
    summary: 'Get request statistics',
    description: 'Retrieve request statistics for reporting',
  })
  @ApiQuery({ name: 'type', enum: RequestType, required: false })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiResponse({
    status: 200,
    description: 'Request statistics retrieved successfully',
    schema: {
      example: {
        total: 25,
        pending: 5,
        approved: 18,
        rejected: 2,
        cancelled: 0,
        approvalRate: 90,
      },
    },
  })
  async getRequestStatistics(
    @CurrentUser() user: any,
    @Query('type') type?: RequestType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    return await this.requestService.getRequestStatistics(start, end, user.id, type);
  }

  /**
   * Check if user can create a specific request
   */
  @Post('validate')
  @ApiOperation({
    summary: 'Validate request creation',
    description: 'Check if user can create a specific request without actually creating it',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    schema: {
      example: {
        canCreate: true,
        reason: null,
      },
    },
  })
  async validateRequest(
    @CurrentUser() user: any,
    @Body() createRequestDto: CreateAnyRequestDto,
  ) {
    return await this.requestService.canCreateRequest(
      user.id,
      createRequestDto.type,
      createRequestDto.requestData,
    );
  }
}
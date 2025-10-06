import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  ParseUUIDPipe,
  Delete,
} from '@nestjs/common';
import { AttendanceRequestService } from '../services/attendance-request.service';
import { CreateAttendanceRequestDto } from '../dto/create-attendance-request.dto';
import { ApproveAttendanceRequestDto } from '../dto/approve-attendance-request.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

/**
 * Attendance Request Controller - HTTP endpoints for attendance request management
 * Provides endpoints for request creation, approval workflow, and history retrieval
 * All endpoints require JWT authentication
 */
@Controller('api/attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceRequestController {
  constructor(private readonly attendanceRequestService: AttendanceRequestService) {}

  /**
   * Create attendance request - Employee submits request for missed attendance
   */
  @Post('request')
  async createRequest(
    @CurrentUser() user: any,
    @Body() createRequestDto: CreateAttendanceRequestDto,
  ) {
    return await this.attendanceRequestService.createRequest(user.id, createRequestDto);
  }

  /**
   * Get user's attendance request history
   */
  @Get('requests')
  async getUserRequests(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return await this.attendanceRequestService.getUserRequests(user.id, start, end);
  }

  /**
   * Get pending requests for manager approval
   */
  @Get('requests/pending')
  async getPendingRequests(@CurrentUser() user: any) {
    return await this.attendanceRequestService.getPendingRequestsForManager(user.id);
  }

  /**
   * Approve or reject attendance request - Manager action
   */
  @Post('requests/approve/:id')
  async approveRequest(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) requestId: string,
    @Body() approveDto: ApproveAttendanceRequestDto,
  ) {
    return await this.attendanceRequestService.approveRequest(requestId, user.id, approveDto);
  }

  /**
   * Get attendance request by ID
   */
  @Get('requests/:id')
  async getRequestById(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) requestId: string,
  ) {
    const request = await this.attendanceRequestService.getRequestById(requestId);
    
    // Check if user has permission to view this request
    // Either the requester or their manager can view
    if (request.userId !== user.id) {
      // Check if current user is the manager of the requester
      // This will be validated in the service layer
      const pendingRequests = await this.attendanceRequestService.getPendingRequestsForManager(user.id);
      const hasAccess = pendingRequests.some(req => req.id === requestId);
      
      if (!hasAccess) {
        throw new Error('No permission to view this request');
      }
    }
    
    return request;
  }

  /**
   * Get request statistics for reporting
   */
  @Get('requests/stats')
  async getRequestStatistics(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    return await this.attendanceRequestService.getRequestStatistics(start, end, user.id);
  }

  /**
   * Check if user can create request for specific date
   */
  @Get('requests/can-create/:date')
  async canCreateRequest(
    @CurrentUser() user: any,
    @Param('date') date: string,
  ) {
    const requestedDate = new Date(date);
    return await this.attendanceRequestService.canCreateRequest(user.id, requestedDate);
  }

  /**
   * Cancel pending request
   */
  @Delete('requests/:id')
  async cancelRequest(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) requestId: string,
  ) {
    await this.attendanceRequestService.cancelRequest(requestId, user.id);
    return { message: 'Request cancelled successfully' };
  }

  /**
   * Get overdue requests (admin/manager endpoint)
   */
  @Get('requests/overdue')
  async getOverdueRequests() {
    return await this.attendanceRequestService.getOverdueRequests();
  }
}
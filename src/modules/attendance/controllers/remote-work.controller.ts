import { Controller, Post, Get, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { RemoteWorkService } from '../services/remote-work.service';
import { AttendanceService } from '../services/attendance.service';
import { CreateRemoteWorkRequestDto } from '../dto/create-remote-work-request.dto';
import { ApproveRemoteWorkRequestDto } from '../dto/approve-remote-work-request.dto';
import { RemoteWorkClockInDto } from '../dto/remote-work-clock-in.dto';
import { ClockOutDto } from '../dto/clock-out.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

/**
 * Remote Work Controller - Handles HTTP requests for remote work management
 * Provides endpoints for remote work requests, approvals, and remote attendance tracking
 * All endpoints require JWT authentication
 */
@Controller('api/remote-work')
@UseGuards(JwtAuthGuard)
export class RemoteWorkController {
  constructor(
    private readonly remoteWorkService: RemoteWorkService,
    private readonly attendanceService: AttendanceService,
  ) {}

  /**
   * Create a new remote work request
   */
  @Post('request')
  async createRequest(
    @CurrentUser() user: any,
    @Body() createRemoteWorkRequestDto: CreateRemoteWorkRequestDto,
  ) {
    return await this.remoteWorkService.createRequest(user.id, createRemoteWorkRequestDto);
  }

  /**
   * Get user's remote work requests
   */
  @Get('requests')
  async getUserRequests(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return await this.remoteWorkService.getUserRequests(user.id, start, end);
  }

  /**
   * Approve or reject a remote work request (for managers)
   */
  @Post('approve/:id')
  async approveRequest(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) requestId: string,
    @Body() approveRemoteWorkRequestDto: ApproveRemoteWorkRequestDto,
  ) {
    return await this.remoteWorkService.approveRequest(
      requestId,
      user.id,
      approveRemoteWorkRequestDto,
    );
  }

  /**
   * Cancel a pending remote work request
   */
  @Post('cancel/:id')
  async cancelRequest(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) requestId: string,
  ) {
    return await this.remoteWorkService.cancelRequest(requestId, user.id);
  }

  /**
   * Get team's remote work requests (for managers)
   */
  @Get('team-requests')
  async getTeamRequests(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return await this.remoteWorkService.getTeamRequests(user.id, start, end);
  }

  /**
   * Get pending team requests for approval (for managers)
   */
  @Get('team-requests/pending')
  async getPendingTeamRequests(@CurrentUser() user: any) {
    return await this.remoteWorkService.getPendingTeamRequests(user.id);
  }

  /**
   * Remote work clock-in endpoint
   */
  @Post('clock-in')
  async remoteWorkClockIn(
    @CurrentUser() user: any,
    @Body() clockInDto: RemoteWorkClockInDto,
  ) {
    return await this.attendanceService.remoteWorkClockIn(user.id, clockInDto);
  }

  /**
   * Remote work clock-out endpoint
   */
  @Post('clock-out')
  async remoteWorkClockOut(
    @CurrentUser() user: any,
    @Body() clockOutDto: ClockOutDto,
  ) {
    return await this.attendanceService.remoteWorkClockOut(user.id, clockOutDto);
  }

  /**
   * Get remote work statistics for a user
   */
  @Get('stats')
  async getRemoteWorkStats(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Default 90 days
    const end = endDate ? new Date(endDate) : new Date();
    
    return await this.remoteWorkService.getUserRemoteWorkStats(user.id, start, end);
  }
}
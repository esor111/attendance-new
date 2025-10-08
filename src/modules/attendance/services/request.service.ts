import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { RequestRepository } from '../repositories/request.repository';
import { DailyAttendanceRepository } from '../repositories/daily-attendance.repository';
import { 
  Request, 
  RequestType, 
  RequestStatus, 
  LeaveRequestData, 
  RemoteWorkRequestData, 
  AttendanceCorrectionRequestData 
} from '../entities/request.entity';
import { DailyAttendance } from '../entities/daily-attendance.entity';

/**
 * Unified Request Service - Consolidated business logic for all request types
 * Handles request creation, approval workflow, and type-specific validation
 * Eliminates duplicate logic from AttendanceRequestService, RemoteWorkService, and LeaveService
 */
@Injectable()
export class RequestService {
  constructor(
    private readonly requestRepository: RequestRepository,
    private readonly dailyAttendanceRepository: DailyAttendanceRepository,
  ) {}

  /**
   * Create a new request with type-specific validation
   */
  async createRequest(
    userId: string,
    type: RequestType,
    requestData: LeaveRequestData | RemoteWorkRequestData | AttendanceCorrectionRequestData,
    notes?: string,
  ): Promise<Request> {
    // Perform type-specific validation
    await this.validateRequestData(userId, type, requestData);

    const request = await this.requestRepository.create({
      userId,
      type,
      requestData,
      status: RequestStatus.PENDING,
      notes,
    });

    // Auto-approve if no approval required
    if (!request.requiresApproval()) {
      return await this.approveRequest(request.id, 'system', {
        status: RequestStatus.APPROVED,
        notes: 'Auto-approved - no approval required for this request type',
      });
    }

    // Send notification to manager for approval
    await this.sendApprovalNotification(request);

    return request;
  }

  /**
   * Get user's requests with optional filtering
   */
  async getUserRequests(
    userId: string,
    type?: RequestType,
    status?: RequestStatus,
    startDate?: Date,
    endDate?: Date,
    limit?: number,
  ): Promise<Request[]> {
    return await this.requestRepository.findByUserId(userId, type, status, startDate, endDate, limit);
  }

  /**
   * Get request by ID with access validation
   */
  async getRequestById(requestId: string, userId: string): Promise<Request> {
    const request = await this.requestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Check if user has access to this request
    const hasAccess = await this.validateRequestAccess(request, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this request');
    }

    return request;
  }

  /**
   * Get pending requests for manager approval
   */
  async getPendingRequestsForManager(managerId: string, type?: RequestType): Promise<Request[]> {
    return await this.requestRepository.findPendingForManager(managerId, type);
  }

  /**
   * Get team requests for manager
   */
  async getTeamRequests(
    managerId: string,
    type?: RequestType,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Request[]> {
    return await this.requestRepository.findTeamRequests(managerId, type, startDate, endDate);
  }

  /**
   * Approve or reject a request
   */
  async approveRequest(
    requestId: string,
    approverId: string,
    approvalData: { 
      status: RequestStatus.APPROVED | RequestStatus.REJECTED; 
      notes?: string; 
      rejectionReason?: string;
    },
  ): Promise<Request> {
    const request = await this.requestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Request has already been processed');
    }

    // Validate approver has permission (unless system approval)
    if (approverId !== 'system') {
      const canApprove = await this.canApproveRequest(request, approverId);
      if (!canApprove) {
        throw new ForbiddenException('No permission to approve this request');
      }
    }

    // Perform type-specific approval logic
    let createdAttendanceId: string | undefined;
    if (approvalData.status === RequestStatus.APPROVED) {
      createdAttendanceId = await this.handleApprovalByType(request);
    } else {
      await this.handleRejectionByType(request);
    }

    // Update request with approval decision
    const updateData: Partial<Request> = {
      status: approvalData.status,
      approverId: approverId === 'system' ? undefined : approverId,
      approvedAt: new Date(),
      approvalNotes: approvalData.notes,
      rejectionReason: approvalData.rejectionReason,
      createdAttendanceId,
    };

    const updatedRequest = await this.requestRepository.update(requestId, updateData);

    // Send notification
    await this.sendDecisionNotification(updatedRequest);

    return updatedRequest;
  }

  /**
   * Cancel a request
   */
  async cancelRequest(requestId: string, userId: string): Promise<Request> {
    const request = await this.requestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    if (![RequestStatus.PENDING, RequestStatus.APPROVED].includes(request.status)) {
      throw new BadRequestException('Can only cancel pending or approved requests');
    }

    // Perform type-specific cancellation logic
    await this.handleCancellationByType(request);

    return await this.requestRepository.update(requestId, { 
      status: RequestStatus.CANCELLED 
    });
  }

  /**
   * Get request statistics
   */
  async getRequestStatistics(
    startDate: Date,
    endDate: Date,
    managerId?: string,
    type?: RequestType,
  ): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
    approvalRate: number;
  }> {
    const stats = await this.requestRepository.getRequestStats(startDate, endDate, managerId, type);
    
    const processedRequests = stats.approved + stats.rejected;
    const approvalRate = processedRequests > 0 
      ? Math.round((stats.approved / processedRequests) * 100) 
      : 0;

    return {
      ...stats,
      approvalRate,
    };
  }

  /**
   * Check if user can create request
   */
  async canCreateRequest(
    userId: string,
    type: RequestType,
    requestData: LeaveRequestData | RemoteWorkRequestData | AttendanceCorrectionRequestData,
  ): Promise<{ canCreate: boolean; reason?: string }> {
    try {
      await this.validateRequestData(userId, type, requestData);
      return { canCreate: true };
    } catch (error) {
      return {
        canCreate: false,
        reason: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  /**
   * Type-specific validation for request data
   */
  private async validateRequestData(
    userId: string,
    type: RequestType,
    requestData: LeaveRequestData | RemoteWorkRequestData | AttendanceCorrectionRequestData,
  ): Promise<void> {
    switch (type) {
      case RequestType.LEAVE:
        await this.validateLeaveRequest(userId, requestData as LeaveRequestData);
        break;
      case RequestType.REMOTE_WORK:
        await this.validateRemoteWorkRequest(userId, requestData as RemoteWorkRequestData);
        break;
      case RequestType.ATTENDANCE_CORRECTION:
        await this.validateAttendanceCorrectionRequest(userId, requestData as AttendanceCorrectionRequestData);
        break;
    }
  }

  /**
   * Validate leave request data
   */
  private async validateLeaveRequest(userId: string, data: LeaveRequestData): Promise<void> {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (startDate > endDate) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    // Check for overlapping requests
    const overlapping = await this.requestRepository.findOverlappingLeaveRequests(
      userId,
      startDate,
      endDate,
    );

    if (overlapping.length > 0) {
      throw new ConflictException('Leave request overlaps with existing approved or pending leave');
    }

    // Validate advance notice (unless emergency)
    if (!data.isEmergency) {
      const leaveTypeConfig = this.getLeaveTypeConfig(data.leaveType);
      if (leaveTypeConfig.minAdvanceNoticeDays > 0) {
        const today = new Date();
        const daysDifference = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDifference < leaveTypeConfig.minAdvanceNoticeDays) {
          throw new BadRequestException(
            `This leave type requires at least ${leaveTypeConfig.minAdvanceNoticeDays} days advance notice`
          );
        }
      }
    }

    // Emergency leave validation
    if (data.isEmergency && !data.emergencyJustification) {
      throw new BadRequestException('Emergency justification is required for emergency leave');
    }

    // Check balance
    if (data.balanceInfo.remainingDays < data.daysRequested) {
      throw new BadRequestException(
        `Insufficient leave balance. Available: ${data.balanceInfo.remainingDays} days, Requested: ${data.daysRequested} days`
      );
    }
  }

  /**
   * Validate remote work request data
   */
  private async validateRemoteWorkRequest(userId: string, data: RemoteWorkRequestData): Promise<void> {
    const requestedDate = new Date(data.requestedDate);
    
    // Validate advance notice (at least 24 hours)
    const now = new Date();
    const timeDiff = requestedDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff < 24) {
      throw new BadRequestException('Remote work requests must be submitted at least 24 hours in advance');
    }

    // Check if user already has a request for this date
    const existingRequest = await this.requestRepository.hasRequestForDate(
      userId,
      RequestType.REMOTE_WORK,
      requestedDate,
    );
    if (existingRequest) {
      throw new ConflictException(`Remote work request already exists for ${data.requestedDate}`);
    }

    // Validate weekly remote work limit (max 2 days per week)
    await this.validateWeeklyRemoteWorkLimit(userId, requestedDate);
  }

  /**
   * Validate attendance correction request data
   */
  private async validateAttendanceCorrectionRequest(userId: string, data: AttendanceCorrectionRequestData): Promise<void> {
    const requestedDate = new Date(data.requestedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    requestedDate.setHours(0, 0, 0, 0);

    // Validate request date is not in the future
    if (requestedDate > today) {
      throw new BadRequestException('Cannot request attendance for future dates');
    }

    // Validate request is within allowed time limit (30 days)
    const maxDaysBack = 30;
    const earliestAllowedDate = new Date(today);
    earliestAllowedDate.setDate(earliestAllowedDate.getDate() - maxDaysBack);

    if (requestedDate < earliestAllowedDate) {
      throw new BadRequestException(
        `Cannot request attendance for dates older than ${maxDaysBack} days`
      );
    }

    // Check if user already has attendance record for this date
    const existingAttendance = await this.dailyAttendanceRepository.findByUserIdAndDate(
      userId,
      requestedDate,
    );
    if (existingAttendance) {
      throw new ConflictException('Attendance record already exists for this date');
    }

    // Check if user already has a request for this date
    const existingRequest = await this.requestRepository.hasRequestForDate(
      userId,
      RequestType.ATTENDANCE_CORRECTION,
      requestedDate,
    );
    if (existingRequest) {
      throw new ConflictException('Attendance request already exists for this date');
    }
  }

  /**
   * Handle approval logic by request type
   */
  private async handleApprovalByType(request: Request): Promise<string | undefined> {
    switch (request.type) {
      case RequestType.LEAVE:
        return await this.handleLeaveApproval(request);
      case RequestType.REMOTE_WORK:
        return await this.handleRemoteWorkApproval(request);
      case RequestType.ATTENDANCE_CORRECTION:
        return await this.handleAttendanceCorrectionApproval(request);
      default:
        return undefined;
    }
  }

  /**
   * Handle rejection logic by request type
   */
  private async handleRejectionByType(request: Request): Promise<void> {
    switch (request.type) {
      case RequestType.LEAVE:
        await this.handleLeaveRejection(request);
        break;
      case RequestType.REMOTE_WORK:
        await this.handleRemoteWorkRejection(request);
        break;
      case RequestType.ATTENDANCE_CORRECTION:
        await this.handleAttendanceCorrectionRejection(request);
        break;
    }
  }

  /**
   * Handle cancellation logic by request type
   */
  private async handleCancellationByType(request: Request): Promise<void> {
    switch (request.type) {
      case RequestType.LEAVE:
        await this.handleLeaveCancellation(request);
        break;
      case RequestType.REMOTE_WORK:
        await this.handleRemoteWorkCancellation(request);
        break;
      case RequestType.ATTENDANCE_CORRECTION:
        await this.handleAttendanceCorrectionCancellation(request);
        break;
    }
  }

  /**
   * Handle leave request approval
   */
  private async handleLeaveApproval(request: Request): Promise<string | undefined> {
    const leaveData = request.requestData as LeaveRequestData;
    
    // Update balance - move days from remaining to used
    leaveData.balanceInfo = {
      ...leaveData.balanceInfo,
      usedDays: leaveData.balanceInfo.usedDays + leaveData.daysRequested,
    };

    // Update the request data
    await this.requestRepository.update(request.id, { requestData: leaveData });

    return undefined;
  }

  /**
   * Handle leave request rejection
   */
  private async handleLeaveRejection(request: Request): Promise<void> {
    const leaveData = request.requestData as LeaveRequestData;
    
    // Restore balance - add days back to remaining
    leaveData.balanceInfo = {
      ...leaveData.balanceInfo,
      remainingDays: leaveData.balanceInfo.remainingDays + leaveData.daysRequested,
    };

    // Update the request data
    await this.requestRepository.update(request.id, { requestData: leaveData });
  }

  /**
   * Handle leave request cancellation
   */
  private async handleLeaveCancellation(request: Request): Promise<void> {
    if (request.status === RequestStatus.APPROVED) {
      // If approved leave is being cancelled, restore the balance
      const leaveData = request.requestData as LeaveRequestData;
      leaveData.balanceInfo = {
        ...leaveData.balanceInfo,
        usedDays: leaveData.balanceInfo.usedDays - leaveData.daysRequested,
        remainingDays: leaveData.balanceInfo.remainingDays + leaveData.daysRequested,
      };

      await this.requestRepository.update(request.id, { requestData: leaveData });
    }
  }

  /**
   * Handle remote work request approval
   */
  private async handleRemoteWorkApproval(request: Request): Promise<string | undefined> {
    // No specific logic needed for remote work approval
    return undefined;
  }

  /**
   * Handle remote work request rejection
   */
  private async handleRemoteWorkRejection(request: Request): Promise<void> {
    // No specific logic needed for remote work rejection
  }

  /**
   * Handle remote work request cancellation
   */
  private async handleRemoteWorkCancellation(request: Request): Promise<void> {
    // No specific logic needed for remote work cancellation
  }

  /**
   * Handle attendance correction request approval
   */
  private async handleAttendanceCorrectionApproval(request: Request): Promise<string> {
    const attendanceData = request.requestData as AttendanceCorrectionRequestData;
    const requestedDate = new Date(attendanceData.requestedDate);

    // Check again if attendance record already exists (race condition protection)
    const existingAttendance = await this.dailyAttendanceRepository.findByUserIdAndDate(
      request.userId,
      requestedDate,
    );
    if (existingAttendance) {
      throw new ConflictException('Attendance record already exists for this date');
    }

    // Create basic attendance record
    const attendanceRecord: Partial<DailyAttendance> = {
      userId: request.userId,
      date: requestedDate,
      status: 'Present',
      notes: `Created from attendance request: ${attendanceData.reason}`,
      totalHours: 8.0, // Default work hours
      isFlagged: true,
      flagReason: 'Manual attendance request - requires verification',
      workLocation: 'OFFICE', // Default to office
    };

    const createdAttendance = await this.dailyAttendanceRepository.create(attendanceRecord);
    return createdAttendance.id;
  }

  /**
   * Handle attendance correction request rejection
   */
  private async handleAttendanceCorrectionRejection(request: Request): Promise<void> {
    // No specific logic needed for attendance correction rejection
  }

  /**
   * Handle attendance correction request cancellation
   */
  private async handleAttendanceCorrectionCancellation(request: Request): Promise<void> {
    // If there's a created attendance record, we might want to flag it or handle it
    // For now, we'll leave the attendance record as is since it might have been modified
  }

  /**
   * Validate weekly remote work limit
   */
  private async validateWeeklyRemoteWorkLimit(userId: string, requestedDate: Date): Promise<void> {
    // Get start and end of the week for the requested date
    const weekStart = new Date(requestedDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // End of week (Saturday)
    weekEnd.setHours(23, 59, 59, 999);

    // Count approved and pending remote work requests for this week
    const weekRequests = await this.requestRepository.findByUserAndDateRange(
      userId,
      RequestType.REMOTE_WORK,
      weekStart,
      weekEnd,
    );
    
    const approvedThisWeek = weekRequests.filter(r => r.status === RequestStatus.APPROVED).length;
    const pendingThisWeek = weekRequests.filter(r => r.status === RequestStatus.PENDING).length;
    
    // Check if adding this request would exceed the limit
    if (approvedThisWeek + pendingThisWeek >= 2) {
      throw new BadRequestException(
        `Weekly remote work limit exceeded. You can only work remotely 2 days per week. ` +
        `This week you have ${approvedThisWeek} approved and ${pendingThisWeek} pending requests.`
      );
    }
  }

  /**
   * Check if user can approve a request
   */
  private async canApproveRequest(request: Request, approverId: string): Promise<boolean> {
    // Simplified: No hierarchy check - RBAC handles permissions
    // If user has approval permission, they can approve
    return true;
  }

  /**
   * Validate if user has access to a request
   */
  private async validateRequestAccess(request: Request, userId: string): Promise<boolean> {
    // Simplified: Users can only access their own requests
    // Admins with proper permissions can access all (handled by RBAC)
    return request.userId === userId;
  }

  /**
   * Get leave type configuration
   */
  private getLeaveTypeConfig(leaveType: string): {
    name: string;
    maxDaysPerYear: number;
    requiresApproval: boolean;
    canCarryForward: boolean;
    maxCarryForwardDays: number;
    minAdvanceNoticeDays: number;
  } {
    const configs = {
      ANNUAL: {
        name: 'Annual Leave',
        maxDaysPerYear: 25,
        requiresApproval: true,
        canCarryForward: true,
        maxCarryForwardDays: 5,
        minAdvanceNoticeDays: 7,
      },
      SICK: {
        name: 'Sick Leave',
        maxDaysPerYear: 10,
        requiresApproval: false,
        canCarryForward: false,
        maxCarryForwardDays: 0,
        minAdvanceNoticeDays: 0,
      },
      PERSONAL: {
        name: 'Personal Leave',
        maxDaysPerYear: 5,
        requiresApproval: true,
        canCarryForward: false,
        maxCarryForwardDays: 0,
        minAdvanceNoticeDays: 3,
      },
      EMERGENCY: {
        name: 'Emergency Leave',
        maxDaysPerYear: 3,
        requiresApproval: true,
        canCarryForward: false,
        maxCarryForwardDays: 0,
        minAdvanceNoticeDays: 0,
      },
    };

    return configs[leaveType as keyof typeof configs] || configs.ANNUAL;
  }

  /**
   * Send approval notification (placeholder - no manager hierarchy)
   */
  private async sendApprovalNotification(request: Request): Promise<void> {
    // Simplified: No manager lookup - notifications handled separately
    console.log(`${request.type} request ${request.id} created for user ${request.userId} - awaiting approval`);
  }

  /**
   * Send decision notification (placeholder)
   */
  private async sendDecisionNotification(request: Request): Promise<void> {
    console.log(`${request.type} request ${request.id} ${request.status.toLowerCase()} for user ${request.userId}`);
  }
}
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { LeaveRequestRepository } from '../repositories/leave-request.repository';
import { LeaveBalanceRepository } from '../repositories/leave-balance.repository';
import { LeaveTypeRepository } from '../repositories/leave-type.repository';
import { ReportingStructureRepository } from '../../attendance/repositories/reporting-structure.repository';
import { LeaveRequest, LeaveRequestStatus } from '../entities/leave-request.entity';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { LeaveApprovalService } from './leave-approval.service';
import { LeaveBalanceService } from './leave-balance.service';

/**
 * Leave Service - Core business logic for leave request operations
 * Handles leave request creation, validation, and workflow management
 * Integrates with balance management and approval workflows
 */
@Injectable()
export class LeaveService {
  constructor(
    private readonly leaveRequestRepository: LeaveRequestRepository,
    private readonly leaveBalanceRepository: LeaveBalanceRepository,
    private readonly leaveTypeRepository: LeaveTypeRepository,
    private readonly reportingStructureRepository: ReportingStructureRepository,
    private readonly leaveApprovalService: LeaveApprovalService,
    private readonly leaveBalanceService: LeaveBalanceService,
  ) {}

  /**
   * Create a new leave request with validation and balance checks
   */
  async createLeaveRequest(userId: string, dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    // Validate leave type exists and is active
    const leaveType = await this.leaveTypeRepository.findById(dto.leaveTypeId);
    if (!leaveType || !leaveType.isActive) {
      throw new BadRequestException('Invalid or inactive leave type');
    }

    // Parse and validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    
    if (startDate > endDate) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    // Validate advance notice requirement (unless emergency)
    if (!dto.isEmergency && leaveType.minAdvanceNoticeDays > 0) {
      const today = new Date();
      const daysDifference = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDifference < leaveType.minAdvanceNoticeDays) {
        throw new BadRequestException(
          `This leave type requires at least ${leaveType.minAdvanceNoticeDays} days advance notice`
        );
      }
    }

    // Emergency leave validation
    if (dto.isEmergency && !dto.emergencyJustification) {
      throw new BadRequestException('Emergency justification is required for emergency leave');
    }

    // Check for overlapping requests
    const overlappingRequests = await this.leaveRequestRepository.findOverlappingRequests(
      userId,
      startDate,
      endDate
    );
    
    if (overlappingRequests.length > 0) {
      throw new BadRequestException('Leave request overlaps with existing approved or pending leave');
    }

    // Check leave balance availability
    const year = startDate.getFullYear();
    const balance = await this.leaveBalanceRepository.findByUserLeaveTypeYear(
      userId,
      dto.leaveTypeId,
      year
    );

    if (balance && balance.remainingDays < dto.daysRequested) {
      throw new BadRequestException(
        `Insufficient leave balance. Available: ${balance.remainingDays} days, Requested: ${dto.daysRequested} days`
      );
    }

    // Create the leave request
    const leaveRequest = await this.leaveRequestRepository.create({
      userId,
      leaveTypeId: dto.leaveTypeId,
      startDate,
      endDate,
      daysRequested: dto.daysRequested,
      reason: dto.reason,
      isEmergency: dto.isEmergency || false,
      emergencyJustification: dto.emergencyJustification,
      status: LeaveRequestStatus.PENDING,
    });

    // Update pending days in balance
    await this.leaveBalanceService.updatePendingDays(
      userId,
      dto.leaveTypeId,
      year,
      dto.daysRequested,
      'add'
    );

    // Trigger approval workflow if required
    if (leaveType.requiresApproval) {
      await this.leaveApprovalService.initiateApprovalWorkflow(leaveRequest.id);
    } else {
      // Auto-approve if no approval required
      await this.approveLeaveRequest(leaveRequest.id, 'system', {
        status: LeaveRequestStatus.APPROVED,
        comments: 'Auto-approved - no approval required for this leave type',
      });
    }

    return await this.leaveRequestRepository.findById(leaveRequest.id) as LeaveRequest;
  }

  /**
   * Get leave requests for a user
   */
  async getUserLeaveRequests(userId: string, limit?: number): Promise<LeaveRequest[]> {
    return await this.leaveRequestRepository.findByUserId(userId, limit);
  }

  /**
   * Get leave request by ID with access validation
   */
  async getLeaveRequestById(requestId: string, userId: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    // Check if user has access to this request
    const hasAccess = await this.validateRequestAccess(request, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this leave request');
    }

    return request;
  }

  /**
   * Cancel a leave request
   */
  async cancelLeaveRequest(requestId: string, userId: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    // Only the requester can cancel their own request
    if (request.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own leave requests');
    }

    // Can only cancel pending or approved requests
    if (![LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED].includes(request.status)) {
      throw new BadRequestException('Can only cancel pending or approved leave requests');
    }

    // Update request status
    const updatedRequest = await this.leaveRequestRepository.update(requestId, {
      status: LeaveRequestStatus.CANCELLED,
    });

    // Update leave balance - remove pending/used days
    const year = request.startDate.getFullYear();
    
    if (request.status === LeaveRequestStatus.PENDING) {
      await this.leaveBalanceService.updatePendingDays(
        userId,
        request.leaveTypeId,
        year,
        request.daysRequested,
        'subtract'
      );
    } else if (request.status === LeaveRequestStatus.APPROVED) {
      await this.leaveBalanceService.updateUsedDays(
        userId,
        request.leaveTypeId,
        year,
        request.daysRequested,
        'subtract'
      );
    }

    return updatedRequest;
  }

  /**
   * Approve or reject a leave request
   */
  async approveLeaveRequest(
    requestId: string,
    approverId: string,
    approvalData: { status: LeaveRequestStatus; comments?: string; rejectionReason?: string }
  ): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Can only approve pending leave requests');
    }

    // Validate approver has permission (unless system approval)
    if (approverId !== 'system') {
      const canApprove = await this.leaveApprovalService.canApproveRequest(requestId, approverId);
      if (!canApprove) {
        throw new ForbiddenException('You do not have permission to approve this leave request');
      }
    }

    const year = request.startDate.getFullYear();

    // Update request with approval decision
    const updateData: Partial<LeaveRequest> = {
      status: approvalData.status,
      approverId: approverId === 'system' ? undefined : approverId,
      approvedAt: new Date(),
      approvalComments: approvalData.comments,
      rejectionReason: approvalData.rejectionReason,
    };

    const updatedRequest = await this.leaveRequestRepository.update(requestId, updateData);

    // Update leave balance based on decision
    if (approvalData.status === LeaveRequestStatus.APPROVED) {
      // Move from pending to used
      await this.leaveBalanceService.updatePendingDays(
        request.userId,
        request.leaveTypeId,
        year,
        request.daysRequested,
        'subtract'
      );
      await this.leaveBalanceService.updateUsedDays(
        request.userId,
        request.leaveTypeId,
        year,
        request.daysRequested,
        'add'
      );
    } else if (approvalData.status === LeaveRequestStatus.REJECTED) {
      // Remove from pending
      await this.leaveBalanceService.updatePendingDays(
        request.userId,
        request.leaveTypeId,
        year,
        request.daysRequested,
        'subtract'
      );
    }

    // Send notification (placeholder for future implementation)
    await this.sendLeaveDecisionNotification(updatedRequest);

    return updatedRequest;
  }

  /**
   * Get team leave requests for managers
   */
  async getTeamLeaveRequests(managerId: string, startDate?: Date, endDate?: Date): Promise<LeaveRequest[]> {
    return await this.leaveRequestRepository.findTeamRequests(managerId, startDate, endDate);
  }

  /**
   * Get pending team leave requests for managers
   */
  async getPendingTeamRequests(managerId: string): Promise<LeaveRequest[]> {
    return await this.leaveRequestRepository.findTeamPendingRequests(managerId);
  }

  /**
   * Validate if user has access to a leave request
   */
  private async validateRequestAccess(request: LeaveRequest, userId: string): Promise<boolean> {
    // User can access their own requests
    if (request.userId === userId) {
      return true;
    }

    // Managers can access their team members' requests
    const isManager = await this.reportingStructureRepository.existsRelationship(
      request.userId,
      userId
    );
    
    return isManager;
  }

  /**
   * Send leave decision notification (placeholder)
   */
  private async sendLeaveDecisionNotification(request: LeaveRequest): Promise<void> {
    // TODO: Implement notification system
    // This could send email, push notification, or in-app notification
    console.log(`Leave request ${request.id} ${request.status.toLowerCase()} for user ${request.userId}`);
  }

  /**
   * Get leave request statistics for a user
   */
  async getLeaveStatistics(userId: string, year: number): Promise<any> {
    const statistics = await this.leaveRequestRepository.getRequestStatistics(userId, year);
    const balances = await this.leaveBalanceRepository.findByUserAndYear(userId, year);

    return {
      requests: statistics,
      balances: balances.map(balance => ({
        leaveType: balance.leaveType.name,
        allocated: balance.allocatedDays,
        used: balance.usedDays,
        pending: balance.pendingDays,
        remaining: balance.remainingDays,
      })),
    };
  }

  /**
   * Check if user can request leave for specific dates
   */
  async canRequestLeave(
    userId: string,
    leaveTypeId: string,
    startDate: Date,
    endDate: Date,
    daysRequested: number
  ): Promise<{ canRequest: boolean; reason?: string }> {
    // Check leave type
    const leaveType = await this.leaveTypeRepository.findById(leaveTypeId);
    if (!leaveType || !leaveType.isActive) {
      return { canRequest: false, reason: 'Invalid or inactive leave type' };
    }

    // Check overlapping requests
    const overlapping = await this.leaveRequestRepository.findOverlappingRequests(
      userId,
      startDate,
      endDate
    );
    if (overlapping.length > 0) {
      return { canRequest: false, reason: 'Overlapping with existing leave request' };
    }

    // Check balance
    const year = startDate.getFullYear();
    const balance = await this.leaveBalanceRepository.findByUserLeaveTypeYear(
      userId,
      leaveTypeId,
      year
    );
    
    if (balance && balance.remainingDays < daysRequested) {
      return { 
        canRequest: false, 
        reason: `Insufficient balance. Available: ${balance.remainingDays} days` 
      };
    }

    // Check advance notice
    const today = new Date();
    const daysDifference = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference < leaveType.minAdvanceNoticeDays) {
      return { 
        canRequest: false, 
        reason: `Requires ${leaveType.minAdvanceNoticeDays} days advance notice` 
      };
    }

    return { canRequest: true };
  }
}
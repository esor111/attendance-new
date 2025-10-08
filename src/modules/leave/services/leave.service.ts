import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LeaveRequest, LeaveRequestStatus, LeaveType, LeaveBalanceInfo } from '../entities/leave-request.entity';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';

/**
 * Simplified Leave Service - Consolidated leave management operations
 * Handles leave requests, approvals, and balance management in a single service
 * Eliminates complex relationships and reduces maintenance overhead
 */
@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
  ) {}

  /**
   * Create a new leave request with validation and balance checks
   */
  async createLeaveRequest(userId: string, dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    // Parse and validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    
    if (startDate > endDate) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    // Get leave type configuration
    const leaveTypeConfig = this.getLeaveTypeConfig(dto.leaveType);

    // Validate advance notice requirement (unless emergency)
    if (!dto.isEmergency && leaveTypeConfig.minAdvanceNoticeDays > 0) {
      const today = new Date();
      const daysDifference = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDifference < leaveTypeConfig.minAdvanceNoticeDays) {
        throw new BadRequestException(
          `This leave type requires at least ${leaveTypeConfig.minAdvanceNoticeDays} days advance notice`
        );
      }
    }

    // Emergency leave validation
    if (dto.isEmergency && !dto.emergencyJustification) {
      throw new BadRequestException('Emergency justification is required for emergency leave');
    }

    // Check for overlapping requests
    const overlappingRequests = await this.findOverlappingRequests(userId, startDate, endDate);
    
    if (overlappingRequests.length > 0) {
      throw new BadRequestException('Leave request overlaps with existing approved or pending leave');
    }

    // Get current balance for this leave type and year
    const year = startDate.getFullYear();
    const currentBalance = await this.getUserLeaveBalance(userId, dto.leaveType, year);

    // Check if sufficient balance is available
    if (currentBalance.remainingDays < dto.daysRequested) {
      throw new BadRequestException(
        `Insufficient leave balance. Available: ${currentBalance.remainingDays} days, Requested: ${dto.daysRequested} days`
      );
    }

    // Calculate updated balance after this request
    const updatedBalance: LeaveBalanceInfo = {
      allocatedDays: currentBalance.allocatedDays,
      usedDays: currentBalance.usedDays,
      remainingDays: currentBalance.remainingDays - dto.daysRequested,
    };

    // Create the leave request
    const leaveRequest = this.leaveRequestRepository.create({
      userId,
      leaveType: dto.leaveType,
      startDate,
      endDate,
      daysRequested: dto.daysRequested,
      reason: dto.reason,
      isEmergency: dto.isEmergency || false,
      emergencyJustification: dto.emergencyJustification,
      status: LeaveRequestStatus.PENDING,
      balanceInfo: updatedBalance,
    });

    const savedRequest = await this.leaveRequestRepository.save(leaveRequest);

    // Auto-approve if no approval required
    if (!leaveTypeConfig.requiresApproval) {
      return await this.approveLeaveRequest(savedRequest.id, 'system', {
        status: LeaveRequestStatus.APPROVED,
        comments: 'Auto-approved - no approval required for this leave type',
      });
    }

    // Send notification to manager for approval (placeholder)
    await this.sendApprovalNotification(savedRequest);

    return savedRequest;
  }

  /**
   * Get leave requests for a user
   */
  async getUserLeaveRequests(userId: string, limit?: number): Promise<LeaveRequest[]> {
    const query = this.leaveRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.approver', 'approver')
      .where('request.userId = :userId', { userId })
      .orderBy('request.createdAt', 'DESC');

    if (limit) {
      query.limit(limit);
    }

    return await query.getMany();
  }

  /**
   * Get leave request by ID with access validation
   */
  async getLeaveRequestById(requestId: string, userId: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.approver', 'approver')
      .where('request.id = :requestId', { requestId })
      .getOne();

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
    const request = await this.leaveRequestRepository.findOne({ where: { id: requestId } });
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

    // Update request status and restore balance
    request.status = LeaveRequestStatus.CANCELLED;
    
    // Restore the balance by adding back the requested days
    request.balanceInfo = {
      ...request.balanceInfo,
      remainingDays: request.balanceInfo.remainingDays + request.daysRequested,
    };

    return await this.leaveRequestRepository.save(request);
  }

  /**
   * Approve or reject a leave request
   */
  async approveLeaveRequest(
    requestId: string,
    approverId: string,
    approvalData: { status: LeaveRequestStatus; comments?: string; rejectionReason?: string }
  ): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepository.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Can only approve pending leave requests');
    }

    // Validate approver has permission (unless system approval)
    if (approverId !== 'system') {
      const canApprove = await this.canApproveRequest(requestId, approverId);
      if (!canApprove) {
        throw new ForbiddenException('You do not have permission to approve this leave request');
      }
    }

    // Update request with approval decision
    request.status = approvalData.status;
    request.approverId = approverId === 'system' ? undefined : approverId;
    request.approvedAt = new Date();
    request.approvalComments = approvalData.comments;
    request.rejectionReason = approvalData.rejectionReason;

    // Update balance based on decision
    if (approvalData.status === LeaveRequestStatus.APPROVED) {
      // Move days from remaining to used
      request.balanceInfo = {
        ...request.balanceInfo,
        usedDays: request.balanceInfo.usedDays + request.daysRequested,
      };
    } else if (approvalData.status === LeaveRequestStatus.REJECTED) {
      // Restore the balance by adding back the requested days
      request.balanceInfo = {
        ...request.balanceInfo,
        remainingDays: request.balanceInfo.remainingDays + request.daysRequested,
      };
    }

    const updatedRequest = await this.leaveRequestRepository.save(request);

    // Send notification (placeholder for future implementation)
    await this.sendLeaveDecisionNotification(updatedRequest);

    return updatedRequest;
  }

  /**
   * Get leave type configuration
   */
  private getLeaveTypeConfig(leaveType: LeaveType): {
    name: string;
    maxDaysPerYear: number;
    requiresApproval: boolean;
    canCarryForward: boolean;
    maxCarryForwardDays: number;
    minAdvanceNoticeDays: number;
  } {
    const configs = {
      [LeaveType.ANNUAL]: {
        name: 'Annual Leave',
        maxDaysPerYear: 25,
        requiresApproval: true,
        canCarryForward: true,
        maxCarryForwardDays: 5,
        minAdvanceNoticeDays: 7,
      },
      [LeaveType.SICK]: {
        name: 'Sick Leave',
        maxDaysPerYear: 10,
        requiresApproval: false,
        canCarryForward: false,
        maxCarryForwardDays: 0,
        minAdvanceNoticeDays: 0,
      },
      [LeaveType.PERSONAL]: {
        name: 'Personal Leave',
        maxDaysPerYear: 5,
        requiresApproval: true,
        canCarryForward: false,
        maxCarryForwardDays: 0,
        minAdvanceNoticeDays: 3,
      },
      [LeaveType.EMERGENCY]: {
        name: 'Emergency Leave',
        maxDaysPerYear: 3,
        requiresApproval: true,
        canCarryForward: false,
        maxCarryForwardDays: 0,
        minAdvanceNoticeDays: 0,
      },
    };

    return configs[leaveType];
  }

  /**
   * Find overlapping leave requests for a user
   */
  private async findOverlappingRequests(userId: string, startDate: Date, endDate: Date): Promise<LeaveRequest[]> {
    return await this.leaveRequestRepository
      .createQueryBuilder('request')
      .where('request.userId = :userId', { userId })
      .andWhere('request.status IN (:...statuses)', { 
        statuses: [LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED] 
      })
      .andWhere(
        '(request.startDate <= :endDate AND request.endDate >= :startDate)',
        { startDate, endDate }
      )
      .getMany();
  }

  /**
   * Get user's current leave balance for a specific leave type and year
   */
  private async getUserLeaveBalance(userId: string, leaveType: LeaveType, year: number): Promise<LeaveBalanceInfo> {
    const leaveTypeConfig = this.getLeaveTypeConfig(leaveType);
    
    // Get all approved requests for this user, leave type, and year
    const approvedRequests = await this.leaveRequestRepository
      .createQueryBuilder('request')
      .where('request.userId = :userId', { userId })
      .andWhere('request.leaveType = :leaveType', { leaveType })
      .andWhere('request.status = :status', { status: LeaveRequestStatus.APPROVED })
      .andWhere('EXTRACT(YEAR FROM request.startDate) = :year', { year })
      .getMany();

    // Calculate used days from approved requests
    const usedDays = approvedRequests.reduce((total, request) => total + request.daysRequested, 0);

    // Get pending requests for this leave type and year
    const pendingRequests = await this.leaveRequestRepository
      .createQueryBuilder('request')
      .where('request.userId = :userId', { userId })
      .andWhere('request.leaveType = :leaveType', { leaveType })
      .andWhere('request.status = :status', { status: LeaveRequestStatus.PENDING })
      .andWhere('EXTRACT(YEAR FROM request.startDate) = :year', { year })
      .getMany();

    // Calculate pending days
    const pendingDays = pendingRequests.reduce((total, request) => total + request.daysRequested, 0);

    // Calculate carry forward days (simplified - could be enhanced with actual carry forward logic)
    const carryForwardDays = 0; // For now, no carry forward

    const allocatedDays = leaveTypeConfig.maxDaysPerYear + carryForwardDays;
    const remainingDays = allocatedDays - usedDays - pendingDays;

    return {
      allocatedDays,
      usedDays,
      remainingDays,
    };
  }

  /**
   * Check if a user can approve a specific leave request
   */
  private async canApproveRequest(requestId: string, approverId: string): Promise<boolean> {
    // Simplified: No hierarchy check - RBAC handles permissions
    // If user has approval permission, they can approve
    return true;
  }

  /**
   * Send approval notification (placeholder - no manager hierarchy)
   */
  private async sendApprovalNotification(request: LeaveRequest): Promise<void> {
    // Simplified: No manager lookup - notifications handled separately
    console.log(`Leave request ${request.id} created for user ${request.userId} - awaiting approval`);
  }

  /**
   * Validate if user has access to a leave request
   */
  private async validateRequestAccess(request: LeaveRequest, userId: string): Promise<boolean> {
    // Simplified: Users can only access their own requests
    // Admins with proper permissions can access all (handled by RBAC)
    return request.userId === userId;
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
    // Get all requests for the user in the specified year
    const requests = await this.leaveRequestRepository
      .createQueryBuilder('request')
      .where('request.userId = :userId', { userId })
      .andWhere('EXTRACT(YEAR FROM request.startDate) = :year', { year })
      .getMany();

    // Calculate statistics by status
    const statistics = requests.reduce((stats, request) => {
      const status = request.status.toLowerCase();
      if (!stats[status]) {
        stats[status] = { count: 0, totalDays: 0 };
      }
      stats[status].count++;
      stats[status].totalDays += request.daysRequested;
      return stats;
    }, {} as Record<string, { count: number; totalDays: number }>);

    // Get current balances for all leave types
    const balances = await Promise.all(
      Object.values(LeaveType).map(async (leaveType) => {
        const balance = await this.getUserLeaveBalance(userId, leaveType, year);
        const config = this.getLeaveTypeConfig(leaveType);
        return {
          leaveType: config.name,
          allocated: balance.allocatedDays,
          used: balance.usedDays,
          remaining: balance.remainingDays,
        };
      })
    );

    return {
      requests: statistics,
      balances,
    };
  }

  /**
   * Get user's leave balances for all leave types
   */
  async getUserLeaveBalances(userId: string, year?: number): Promise<any[]> {
    const targetYear = year || new Date().getFullYear();
    
    return await Promise.all(
      Object.values(LeaveType).map(async (leaveType) => {
        const balance = await this.getUserLeaveBalance(userId, leaveType, targetYear);
        const config = this.getLeaveTypeConfig(leaveType);
        
        return {
          leaveType: {
            type: leaveType,
            name: config.name,
            maxDaysPerYear: config.maxDaysPerYear,
            requiresApproval: config.requiresApproval,
            canCarryForward: config.canCarryForward,
          },
          year: targetYear,
          allocatedDays: balance.allocatedDays,
          usedDays: balance.usedDays,
          remainingDays: balance.remainingDays,
          totalAvailableDays: balance.allocatedDays,
        };
      })
    );
  }

  /**
   * Check if user can request leave for specific dates
   */
  async canRequestLeave(
    userId: string,
    leaveType: LeaveType,
    startDate: Date,
    endDate: Date,
    daysRequested: number
  ): Promise<{ canRequest: boolean; reason?: string }> {
    // Get leave type configuration
    const leaveTypeConfig = this.getLeaveTypeConfig(leaveType);

    // Check overlapping requests
    const overlapping = await this.findOverlappingRequests(userId, startDate, endDate);
    if (overlapping.length > 0) {
      return { canRequest: false, reason: 'Overlapping with existing leave request' };
    }

    // Check balance
    const year = startDate.getFullYear();
    const balance = await this.getUserLeaveBalance(userId, leaveType, year);
    
    if (balance.remainingDays < daysRequested) {
      return { 
        canRequest: false, 
        reason: `Insufficient balance. Available: ${balance.remainingDays} days` 
      };
    }

    // Check advance notice
    const today = new Date();
    const daysDifference = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference < leaveTypeConfig.minAdvanceNoticeDays) {
      return { 
        canRequest: false, 
        reason: `Requires ${leaveTypeConfig.minAdvanceNoticeDays} days advance notice` 
      };
    }

    return { canRequest: true };
  }
}
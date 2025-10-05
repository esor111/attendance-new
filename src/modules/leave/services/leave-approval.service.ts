import { Injectable, NotFoundException } from '@nestjs/common';
import { LeaveRequestRepository } from '../repositories/leave-request.repository';
import { ReportingStructureRepository } from '../../attendance/repositories/reporting-structure.repository';
import { LeaveRequest } from '../entities/leave-request.entity';

/**
 * Leave Approval Service - Manages leave request approval workflow
 * Handles manager approval logic and notification system
 * Determines approval permissions based on reporting structure
 */
@Injectable()
export class LeaveApprovalService {
  constructor(
    private readonly leaveRequestRepository: LeaveRequestRepository,
    private readonly reportingStructureRepository: ReportingStructureRepository,
  ) {}

  /**
   * Initiate approval workflow for a leave request
   */
  async initiateApprovalWorkflow(requestId: string): Promise<void> {
    const request = await this.leaveRequestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    // Find the direct manager for approval
    const manager = await this.reportingStructureRepository.findCurrentManagerByEmployeeId(request.userId);
    
    if (manager) {
      // Send notification to manager (placeholder)
      await this.sendApprovalNotification(request, manager.managerId);
    } else {
      // No manager found - could auto-approve or escalate
      console.log(`No manager found for user ${request.userId}, leave request ${requestId} needs manual review`);
    }
  }

  /**
   * Check if a user can approve a specific leave request
   */
  async canApproveRequest(requestId: string, approverId: string): Promise<boolean> {
    const request = await this.leaveRequestRepository.findById(requestId);
    if (!request) {
      return false;
    }

    // Check if approver is the direct manager of the requester
    const isDirectManager = await this.reportingStructureRepository.existsRelationship(
      request.userId,
      approverId
    );

    if (isDirectManager) {
      return true;
    }

    // Check if approver is in the management chain (indirect manager)
    const managementChain = await this.reportingStructureRepository.getReportingChain(request.userId);
    return managementChain.some(manager => manager.managerId === approverId);
  }

  /**
   * Get all leave requests pending approval for a manager
   */
  async getPendingApprovalsForManager(managerId: string): Promise<LeaveRequest[]> {
    return await this.leaveRequestRepository.findTeamPendingRequests(managerId);
  }

  /**
   * Get approval history for a leave request
   */
  async getApprovalHistory(requestId: string): Promise<any> {
    const request = await this.leaveRequestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    // For now, return basic approval info
    // In a more complex system, this could track multiple approval steps
    return {
      requestId: request.id,
      currentStatus: request.status,
      approver: request.approver ? {
        id: request.approver.id,
        name: request.approver.name,
        email: request.approver.email,
      } : null,
      approvedAt: request.approvedAt,
      comments: request.approvalComments,
      rejectionReason: request.rejectionReason,
    };
  }

  /**
   * Escalate leave request to higher management
   */
  async escalateRequest(requestId: string, currentApproverId: string): Promise<void> {
    const request = await this.leaveRequestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    // Find the manager of the current approver
    const higherManager = await this.reportingStructureRepository.findCurrentManagerByEmployeeId(currentApproverId);
    
    if (higherManager) {
      await this.sendEscalationNotification(request, higherManager.managerId, currentApproverId);
    } else {
      // No higher manager - could send to HR or admin
      console.log(`No higher manager found for escalation of request ${requestId}`);
    }
  }

  /**
   * Get approval statistics for a manager
   */
  async getApprovalStatistics(managerId: string, startDate: Date, endDate: Date): Promise<any> {
    const teamRequests = await this.leaveRequestRepository.findTeamRequests(
      managerId,
      startDate,
      endDate
    );

    const statistics = teamRequests.reduce((stats, request) => {
      const status = request.status.toLowerCase();
      stats[status] = (stats[status] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    const totalRequests = teamRequests.length;
    const pendingRequests = statistics.pending || 0;
    const approvedRequests = statistics.approved || 0;
    const rejectedRequests = statistics.rejected || 0;

    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      approvalRate: totalRequests > 0 ? (approvedRequests / (approvedRequests + rejectedRequests)) * 100 : 0,
      averageResponseTime: await this.calculateAverageResponseTime(teamRequests),
    };
  }

  /**
   * Send approval notification to manager
   */
  private async sendApprovalNotification(request: LeaveRequest, managerId: string): Promise<void> {
    // TODO: Implement notification system
    // This could send email, push notification, or in-app notification
    console.log(`Approval notification sent to manager ${managerId} for leave request ${request.id}`);
  }

  /**
   * Send escalation notification
   */
  private async sendEscalationNotification(
    request: LeaveRequest,
    higherManagerId: string,
    currentApproverId: string
  ): Promise<void> {
    // TODO: Implement notification system
    console.log(`Leave request ${request.id} escalated from ${currentApproverId} to ${higherManagerId}`);
  }

  /**
   * Calculate average response time for processed requests
   */
  private async calculateAverageResponseTime(requests: LeaveRequest[]): Promise<number> {
    const processedRequests = requests.filter(request => 
      request.approvedAt && ['APPROVED', 'REJECTED'].includes(request.status)
    );

    if (processedRequests.length === 0) {
      return 0;
    }

    const totalResponseTime = processedRequests.reduce((total, request) => {
      const responseTime = request.approvedAt!.getTime() - request.createdAt.getTime();
      return total + responseTime;
    }, 0);

    // Return average response time in hours
    return Math.round((totalResponseTime / processedRequests.length) / (1000 * 60 * 60));
  }

  /**
   * Auto-approve leave requests based on criteria
   */
  async processAutoApprovals(): Promise<void> {
    // This could be called by a scheduled job
    // Auto-approve requests that meet certain criteria:
    // - Emergency leave from trusted employees
    // - Leave types that don't require approval
    // - Requests from employees with good leave history
    
    // For now, this is a placeholder for future implementation
    console.log('Processing auto-approvals...');
  }

  /**
   * Send reminder notifications for pending approvals
   */
  async sendPendingApprovalReminders(): Promise<void> {
    // This could be called by a scheduled job
    // Send reminders to managers who have pending approvals older than X days
    
    // For now, this is a placeholder for future implementation
    console.log('Sending pending approval reminders...');
  }
}
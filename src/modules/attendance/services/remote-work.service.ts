import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { RemoteWorkRequestRepository } from '../repositories/remote-work-request.repository';
import { RemoteWorkRequest } from '../entities/remote-work-request.entity';
import { CreateRemoteWorkRequestDto } from '../dto/create-remote-work-request.dto';
import { ApproveRemoteWorkRequestDto } from '../dto/approve-remote-work-request.dto';

/**
 * Remote Work Service - Business logic for remote work request management
 * Handles request creation, approval workflow, and policy validation
 * Integrates with reporting structure for manager approval process
 */
@Injectable()
export class RemoteWorkService {
  constructor(
    private readonly remoteWorkRepository: RemoteWorkRequestRepository,
  ) {}

  /**
   * Create a new remote work request
   */
  async createRequest(userId: string, dto: CreateRemoteWorkRequestDto): Promise<RemoteWorkRequest> {
    const requestedDate = new Date(dto.requestedDate);
    
    // Validate advance notice (at least 24 hours in advance)
    const now = new Date();
    const timeDiff = requestedDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff < 24) {
      throw new BadRequestException('Remote work requests must be submitted at least 24 hours in advance');
    }

    // Check if user already has a request for this date
    const existingRequest = await this.remoteWorkRepository.findByUserIdAndDate(userId, requestedDate);
    if (existingRequest) {
      throw new ConflictException(`Remote work request already exists for ${dto.requestedDate}`);
    }

    // Validate remote work policy limits (max 2 days per week)
    await this.validateWeeklyRemoteWorkLimit(userId, requestedDate);

    const requestData: Partial<RemoteWorkRequest> = {
      userId,
      requestedDate,
      reason: dto.reason,
      remoteLocation: dto.remoteLocation,
      status: 'PENDING',
      requestedAt: new Date(),
      notes: dto.notes,
    };

    return await this.remoteWorkRepository.create(requestData);
  }

  /**
   * Approve or reject a remote work request
   */
  async approveRequest(
    requestId: string, 
    managerId: string, 
    dto: ApproveRemoteWorkRequestDto
  ): Promise<RemoteWorkRequest> {
    const request = await this.remoteWorkRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException('Remote work request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase()}`);
    }

    // Simplified: No hierarchy check - RBAC handles permissions

    // Check if the requested date is still in the future
    const requestedDate = new Date(request.requestedDate);
    const now = new Date();
    if (requestedDate <= now) {
      throw new BadRequestException('Cannot approve requests for past dates');
    }

    const updateData: Partial<RemoteWorkRequest> = {
      status: dto.decision,
      approverId: managerId,
      approvedAt: new Date(),
      approvalNotes: dto.approvalNotes,
    };

    return await this.remoteWorkRepository.update(requestId, updateData);
  }

  /**
   * Cancel a pending remote work request
   */
  async cancelRequest(requestId: string, userId: string): Promise<RemoteWorkRequest> {
    const request = await this.remoteWorkRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException('Remote work request not found');
    }

    if (request.userId !== userId) {
      throw new BadRequestException('You can only cancel your own requests');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Cannot cancel ${request.status.toLowerCase()} request`);
    }

    return await this.remoteWorkRepository.update(requestId, { status: 'CANCELLED' });
  }

  /**
   * Get user's remote work requests
   */
  async getUserRequests(userId: string, startDate?: Date, endDate?: Date): Promise<RemoteWorkRequest[]> {
    if (startDate && endDate) {
      return await this.remoteWorkRepository.findByUserIdAndDateRange(userId, startDate, endDate);
    }
    return await this.remoteWorkRepository.findByUserId(userId);
  }

  /**
   * Check if user has approved remote work for a specific date
   */
  async hasApprovedRemoteWork(userId: string, date: Date): Promise<boolean> {
    return await this.remoteWorkRepository.hasApprovedRequestForDate(userId, date);
  }

  /**
   * Get remote work statistics for a user
   */
  async getUserRemoteWorkStats(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<{
    totalRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    pendingRequests: number;
    approvalRate: number;
    weeklyBreakdown: any[];
  }> {
    const stats = await this.remoteWorkRepository.getUserRemoteWorkStats(userId, startDate, endDate);
    const requests = await this.remoteWorkRepository.findByUserIdAndDateRange(userId, startDate, endDate);
    
    // Calculate weekly breakdown
    const weeklyBreakdown = this.calculateWeeklyBreakdown(requests, startDate, endDate);

    return {
      ...stats,
      weeklyBreakdown,
    };
  }

  /**
   * Validate weekly remote work limit (max 2 days per week)
   */
  private async validateWeeklyRemoteWorkLimit(userId: string, requestedDate: Date): Promise<void> {
    // Get start and end of the week for the requested date
    const weekStart = new Date(requestedDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // End of week (Saturday)
    weekEnd.setHours(23, 59, 59, 999);

    // Count approved remote work requests for this week
    const weekRequests = await this.remoteWorkRepository.findByUserIdAndDateRange(
      userId, 
      weekStart, 
      weekEnd
    );
    
    const approvedThisWeek = weekRequests.filter(r => r.status === 'APPROVED').length;
    const pendingThisWeek = weekRequests.filter(r => r.status === 'PENDING').length;
    
    // Check if adding this request would exceed the limit
    if (approvedThisWeek + pendingThisWeek >= 2) {
      throw new BadRequestException(
        `Weekly remote work limit exceeded. You can only work remotely 2 days per week. ` +
        `This week you have ${approvedThisWeek} approved and ${pendingThisWeek} pending requests.`
      );
    }
  }

  /**
   * Calculate weekly breakdown of remote work requests
   */
  private calculateWeeklyBreakdown(
    requests: RemoteWorkRequest[], 
    startDate: Date, 
    endDate: Date
  ): any[] {
    const weeks: any[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const weekStart = new Date(currentDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekRequests = requests.filter(request => {
        const requestDate = new Date(request.requestedDate);
        return requestDate >= weekStart && requestDate <= weekEnd;
      });
      
      weeks.push({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        totalRequests: weekRequests.length,
        approvedRequests: weekRequests.filter(r => r.status === 'APPROVED').length,
        rejectedRequests: weekRequests.filter(r => r.status === 'REJECTED').length,
        pendingRequests: weekRequests.filter(r => r.status === 'PENDING').length,
      });
      
      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }
    
    return weeks;
  }
}
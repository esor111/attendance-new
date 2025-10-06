import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { AttendanceRequestRepository } from '../repositories/attendance-request.repository';
import { DailyAttendanceRepository } from '../repositories/daily-attendance.repository';
import { ReportingStructureRepository } from '../repositories/reporting-structure.repository';
import { AttendanceRequest } from '../entities/attendance-request.entity';
import { DailyAttendance } from '../entities/daily-attendance.entity';
import { CreateAttendanceRequestDto } from '../dto/create-attendance-request.dto';
import { ApproveAttendanceRequestDto } from '../dto/approve-attendance-request.dto';

/**
 * Attendance Request Service - Business logic for attendance request management
 * Handles request creation, approval workflow, and attendance record generation
 * Includes validation for request time limits and business rule compliance
 */
@Injectable()
export class AttendanceRequestService {
  constructor(
    private readonly attendanceRequestRepository: AttendanceRequestRepository,
    private readonly dailyAttendanceRepository: DailyAttendanceRepository,
    private readonly reportingStructureRepository: ReportingStructureRepository,
  ) {}

  /**
   * Create a new attendance request
   */
  async createRequest(userId: string, dto: CreateAttendanceRequestDto): Promise<AttendanceRequest> {
    const requestedDate = new Date(dto.requestedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    requestedDate.setHours(0, 0, 0, 0);

    // Validate request date is not in the future
    if (requestedDate > today) {
      throw new BadRequestException('Cannot request attendance for future dates');
    }

    // Validate request is within allowed time limit (e.g., 30 days)
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
    const existingRequest = await this.attendanceRequestRepository.hasRequestForDate(
      userId,
      requestedDate,
    );
    if (existingRequest) {
      throw new ConflictException('Attendance request already exists for this date');
    }

    // Calculate request deadline (e.g., 7 days from creation)
    const requestDeadline = new Date();
    requestDeadline.setDate(requestDeadline.getDate() + 7);

    const requestData: Partial<AttendanceRequest> = {
      userId,
      requestedDate,
      reason: dto.reason,
      status: 'PENDING',
      requestDeadline,
    };

    return await this.attendanceRequestRepository.create(requestData);
  }

  /**
   * Get user's attendance request history
   */
  async getUserRequests(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AttendanceRequest[]> {
    return await this.attendanceRequestRepository.findByUserId(userId, startDate, endDate);
  }

  /**
   * Get pending requests for manager approval
   */
  async getPendingRequestsForManager(managerId: string): Promise<AttendanceRequest[]> {
    return await this.attendanceRequestRepository.findPendingForManager(managerId);
  }

  /**
   * Approve or reject an attendance request
   */
  async approveRequest(
    requestId: string,
    approverId: string,
    dto: ApproveAttendanceRequestDto,
  ): Promise<AttendanceRequest> {
    const request = await this.attendanceRequestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException('Attendance request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request has already been processed');
    }

    // Verify approver has permission to approve this request
    const hasPermission = await this.reportingStructureRepository.existsRelationship(
      request.userId,
      approverId,
    );
    if (!hasPermission) {
      throw new BadRequestException('No permission to approve this request');
    }

    // Check if request is past deadline
    if (request.requestDeadline && new Date() > request.requestDeadline) {
      throw new BadRequestException('Request has passed the approval deadline');
    }

    const updateData: Partial<AttendanceRequest> = {
      status: dto.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      approverId,
      approvalDate: new Date(),
      approvalNotes: dto.notes,
    };

    // If approved, create attendance record
    if (dto.action === 'APPROVE') {
      const createdAttendance = await this.createAttendanceRecord(request);
      updateData.createdAttendanceId = createdAttendance.id;
    }

    return await this.attendanceRequestRepository.update(requestId, updateData);
  }

  /**
   * Create attendance record from approved request
   */
  private async createAttendanceRecord(request: AttendanceRequest): Promise<DailyAttendance> {
    // Check again if attendance record already exists (race condition protection)
    const existingAttendance = await this.dailyAttendanceRepository.findByUserIdAndDate(
      request.userId,
      request.requestedDate,
    );
    if (existingAttendance) {
      throw new ConflictException('Attendance record already exists for this date');
    }

    // Create basic attendance record with minimal data
    const attendanceData: Partial<DailyAttendance> = {
      userId: request.userId,
      date: request.requestedDate,
      status: 'Present',
      notes: `Created from attendance request: ${request.reason}`,
      // Set default work hours (8 hours) for requested attendance
      totalHours: 8.0,
      // Mark as flagged for review since it's a manual request
      isFlagged: true,
      flagReason: 'Manual attendance request - requires verification',
      workLocation: 'OFFICE', // Default to office
    };

    return await this.dailyAttendanceRepository.create(attendanceData);
  }

  /**
   * Get attendance request by ID
   */
  async getRequestById(requestId: string): Promise<AttendanceRequest> {
    const request = await this.attendanceRequestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException('Attendance request not found');
    }
    return request;
  }

  /**
   * Get request statistics for reporting
   */
  async getRequestStatistics(
    startDate: Date,
    endDate: Date,
    managerId?: string,
  ): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    approvalRate: number;
  }> {
    const stats = await this.attendanceRequestRepository.getRequestStats(
      startDate,
      endDate,
      managerId,
    );

    const approvalRate = stats.total > 0 
      ? Math.round((stats.approved / (stats.approved + stats.rejected)) * 100) || 0
      : 0;

    return {
      ...stats,
      approvalRate,
    };
  }

  /**
   * Check if user can create request for date
   */
  async canCreateRequest(userId: string, requestedDate: Date): Promise<{
    canCreate: boolean;
    reason?: string;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(requestedDate);
    checkDate.setHours(0, 0, 0, 0);

    // Check if date is in the future
    if (checkDate > today) {
      return {
        canCreate: false,
        reason: 'Cannot request attendance for future dates',
      };
    }

    // Check if date is too old
    const maxDaysBack = 30;
    const earliestAllowedDate = new Date(today);
    earliestAllowedDate.setDate(earliestAllowedDate.getDate() - maxDaysBack);

    if (checkDate < earliestAllowedDate) {
      return {
        canCreate: false,
        reason: `Cannot request attendance for dates older than ${maxDaysBack} days`,
      };
    }

    // Check if attendance already exists
    const existingAttendance = await this.dailyAttendanceRepository.findByUserIdAndDate(
      userId,
      checkDate,
    );
    if (existingAttendance) {
      return {
        canCreate: false,
        reason: 'Attendance record already exists for this date',
      };
    }

    // Check if request already exists
    const existingRequest = await this.attendanceRequestRepository.hasRequestForDate(
      userId,
      checkDate,
    );
    if (existingRequest) {
      return {
        canCreate: false,
        reason: 'Attendance request already exists for this date',
      };
    }

    return { canCreate: true };
  }

  /**
   * Get overdue requests (past deadline and still pending)
   */
  async getOverdueRequests(): Promise<AttendanceRequest[]> {
    const overdueRequests = await this.attendanceRequestRepository.findOverdueRequests();
    const today = new Date();

    return overdueRequests.filter(request => 
      request.requestDeadline && request.requestDeadline < today
    );
  }

  /**
   * Cancel a pending request (by user)
   */
  async cancelRequest(requestId: string, userId: string): Promise<void> {
    const request = await this.attendanceRequestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException('Attendance request not found');
    }

    if (request.userId !== userId) {
      throw new BadRequestException('Can only cancel your own requests');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Can only cancel pending requests');
    }

    await this.attendanceRequestRepository.delete(requestId);
  }
}
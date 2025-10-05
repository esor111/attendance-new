import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LeaveRequest, LeaveRequestStatus } from '../entities/leave-request.entity';

/**
 * Leave Request Repository - Data access layer for leave request operations
 * Provides CRUD operations and business-specific queries for leave requests
 */
@Injectable()
export class LeaveRequestRepository {
  constructor(
    @InjectRepository(LeaveRequest)
    private readonly repository: Repository<LeaveRequest>,
  ) {}

  /**
   * Create a new leave request
   */
  async create(requestData: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const request = this.repository.create(requestData);
    return await this.repository.save(request);
  }

  /**
   * Find leave request by ID with relations
   */
  async findById(id: string): Promise<LeaveRequest | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['user', 'leaveType', 'approver'],
    });
  }

  /**
   * Find leave requests by user ID
   */
  async findByUserId(userId: string, limit?: number): Promise<LeaveRequest[]> {
    const query = this.repository.find({
      where: { userId },
      relations: ['leaveType', 'approver'],
      order: { createdAt: 'DESC' },
    });

    if (limit) {
      return await this.repository.find({
        where: { userId },
        relations: ['leaveType', 'approver'],
        order: { createdAt: 'DESC' },
        take: limit,
      });
    }

    return await query;
  }

  /**
   * Find pending leave requests for a manager's team
   */
  async findTeamPendingRequests(managerUserId: string): Promise<LeaveRequest[]> {
    return await this.repository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.leaveType', 'leaveType')
      .leftJoin('reporting_structure', 'rs', 'rs.employee_id = request.user_id')
      .where('rs.manager_id = :managerUserId', { managerUserId })
      .andWhere('request.status = :status', { status: LeaveRequestStatus.PENDING })
      .andWhere('(rs.end_date IS NULL OR rs.end_date >= CURRENT_DATE)')
      .orderBy('request.createdAt', 'ASC')
      .getMany();
  }

  /**
   * Find all leave requests for a manager's team
   */
  async findTeamRequests(managerUserId: string, startDate?: Date, endDate?: Date): Promise<LeaveRequest[]> {
    let query = this.repository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.leaveType', 'leaveType')
      .leftJoinAndSelect('request.approver', 'approver')
      .leftJoin('reporting_structure', 'rs', 'rs.employee_id = request.user_id')
      .where('rs.manager_id = :managerUserId', { managerUserId })
      .andWhere('(rs.end_date IS NULL OR rs.end_date >= CURRENT_DATE)');

    if (startDate && endDate) {
      query = query.andWhere(
        '(request.start_date <= :endDate AND request.end_date >= :startDate)',
        { startDate, endDate }
      );
    }

    return await query
      .orderBy('request.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Update leave request
   */
  async update(id: string, updateData: Partial<LeaveRequest>): Promise<LeaveRequest> {
    await this.repository.update(id, updateData);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Leave request not found after update');
    }
    return updated;
  }

  /**
   * Check for overlapping leave requests
   */
  async findOverlappingRequests(
    userId: string,
    startDate: Date,
    endDate: Date,
    excludeRequestId?: string
  ): Promise<LeaveRequest[]> {
    let query = this.repository
      .createQueryBuilder('request')
      .where('request.user_id = :userId', { userId })
      .andWhere('request.status IN (:...statuses)', { 
        statuses: [LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED] 
      })
      .andWhere(
        '(request.start_date <= :endDate AND request.end_date >= :startDate)',
        { startDate, endDate }
      );

    if (excludeRequestId) {
      query = query.andWhere('request.id != :excludeRequestId', { excludeRequestId });
    }

    return await query.getMany();
  }

  /**
   * Find approved leave requests for a user in a date range
   */
  async findApprovedRequestsInRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<LeaveRequest[]> {
    return await this.repository.find({
      where: {
        userId,
        status: LeaveRequestStatus.APPROVED,
        startDate: Between(startDate, endDate),
      },
      relations: ['leaveType'],
      order: { startDate: 'ASC' },
    });
  }

  /**
   * Find pending requests by leave type and user
   */
  async findPendingByUserAndLeaveType(
    userId: string,
    leaveTypeId: string
  ): Promise<LeaveRequest[]> {
    return await this.repository.find({
      where: {
        userId,
        leaveTypeId,
        status: LeaveRequestStatus.PENDING,
      },
      order: { startDate: 'ASC' },
    });
  }

  /**
   * Get leave request statistics for a user
   */
  async getRequestStatistics(userId: string, year: number): Promise<any> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const result = await this.repository
      .createQueryBuilder('request')
      .select([
        'request.status',
        'COUNT(*) as count',
        'SUM(request.days_requested) as totalDays',
      ])
      .where('request.user_id = :userId', { userId })
      .andWhere('request.start_date >= :startDate', { startDate })
      .andWhere('request.start_date <= :endDate', { endDate })
      .groupBy('request.status')
      .getRawMany();

    return result.reduce((stats, row) => {
      stats[row.status.toLowerCase()] = {
        count: parseInt(row.count),
        totalDays: parseFloat(row.totalDays) || 0,
      };
      return stats;
    }, {});
  }

  /**
   * Delete leave request
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
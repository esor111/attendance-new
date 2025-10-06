import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { AttendanceRequest } from '../entities/attendance-request.entity';

/**
 * Attendance Request Repository - Data access layer for attendance requests
 * Provides specialized queries for request management and approval workflows
 */
@Injectable()
export class AttendanceRequestRepository {
  constructor(
    @InjectRepository(AttendanceRequest)
    private readonly repository: Repository<AttendanceRequest>,
  ) {}

  /**
   * Create a new attendance request
   */
  async create(data: Partial<AttendanceRequest>): Promise<AttendanceRequest> {
    const request = this.repository.create(data);
    return await this.repository.save(request);
  }

  /**
   * Find attendance request by ID
   */
  async findById(id: string): Promise<AttendanceRequest | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['user', 'approver', 'createdAttendance'],
    });
  }

  /**
   * Find attendance request by user and date
   */
  async findByUserAndDate(userId: string, requestedDate: Date): Promise<AttendanceRequest | null> {
    return await this.repository.findOne({
      where: { 
        userId,
        requestedDate,
      },
      relations: ['user', 'approver'],
    });
  }

  /**
   * Find user's attendance request history
   */
  async findByUserId(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50,
  ): Promise<AttendanceRequest[]> {
    const query = this.repository.createQueryBuilder('request')
      .leftJoinAndSelect('request.approver', 'approver')
      .leftJoinAndSelect('request.createdAttendance', 'attendance')
      .where('request.userId = :userId', { userId })
      .orderBy('request.requestedDate', 'DESC')
      .limit(limit);

    if (startDate && endDate) {
      query.andWhere('request.requestedDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    return await query.getMany();
  }

  /**
   * Find pending requests for manager approval
   */
  async findPendingForManager(managerId: string, limit: number = 50): Promise<AttendanceRequest[]> {
    // First get team member IDs from reporting structure
    const teamMemberQuery = `
      SELECT DISTINCT rs.employee_id 
      FROM reporting_structure rs 
      WHERE rs.manager_id = $1 
        AND rs.start_date <= CURRENT_DATE 
        AND (rs.end_date IS NULL OR rs.end_date >= CURRENT_DATE)
    `;
    
    const teamMemberResult = await this.repository.query(teamMemberQuery, [managerId]);
    const teamMemberIds = teamMemberResult.map((row: any) => row.employee_id);

    if (teamMemberIds.length === 0) {
      return [];
    }

    return await this.repository.find({
      where: {
        userId: In(teamMemberIds),
        status: 'PENDING',
      },
      relations: ['user'],
      order: {
        requestedDate: 'ASC',
        createdAt: 'ASC',
      },
      take: limit,
    });
  }

  /**
   * Find all pending requests (for admin)
   */
  async findPending(limit: number = 50): Promise<AttendanceRequest[]> {
    return await this.repository.find({
      where: { status: 'PENDING' },
      relations: ['user'],
      order: {
        requestedDate: 'ASC',
        createdAt: 'ASC',
      },
      take: limit,
    });
  }

  /**
   * Update attendance request
   */
  async update(id: string, data: Partial<AttendanceRequest>): Promise<AttendanceRequest> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated attendance request');
    }
    return updated;
  }

  /**
   * Check if user has pending request for date
   */
  async hasPendingRequest(userId: string, requestedDate: Date): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        userId,
        requestedDate,
        status: 'PENDING',
      },
    });
    return count > 0;
  }

  /**
   * Check if user has any request for date (any status)
   */
  async hasRequestForDate(userId: string, requestedDate: Date): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        userId,
        requestedDate,
      },
    });
    return count > 0;
  }

  /**
   * Get request statistics for date range
   */
  async getRequestStats(
    startDate: Date,
    endDate: Date,
    managerId?: string,
  ): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    let query = this.repository.createQueryBuilder('request')
      .where('request.requestedDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    // If manager ID provided, filter by team members
    if (managerId) {
      const teamMemberQuery = `
        SELECT DISTINCT rs.employee_id 
        FROM reporting_structure rs 
        WHERE rs.manager_id = $1 
          AND rs.start_date <= CURRENT_DATE 
          AND (rs.end_date IS NULL OR rs.end_date >= CURRENT_DATE)
      `;
      
      const teamMemberResult = await this.repository.query(teamMemberQuery, [managerId]);
      const teamMemberIds = teamMemberResult.map((row: any) => row.employee_id);

      if (teamMemberIds.length === 0) {
        return { total: 0, pending: 0, approved: 0, rejected: 0 };
      }

      query = query.andWhere('request.userId IN (:...teamMemberIds)', { teamMemberIds });
    }

    const requests = await query.getMany();

    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'PENDING').length,
      approved: requests.filter(r => r.status === 'APPROVED').length,
      rejected: requests.filter(r => r.status === 'REJECTED').length,
    };
  }

  /**
   * Find requests that are past deadline and still pending
   */
  async findOverdueRequests(): Promise<AttendanceRequest[]> {
    return await this.repository.find({
      where: {
        status: 'PENDING',
      },
      relations: ['user'],
    });
  }

  /**
   * Delete attendance request (for cleanup)
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
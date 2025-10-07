import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Request, RequestType, RequestStatus } from '../entities/request.entity';

/**
 * Unified Request Repository - Data access layer for all request types
 * Provides generic CRUD operations and specialized queries for request management
 * Consolidates functionality from AttendanceRequestRepository, RemoteWorkRequestRepository, and LeaveRepository
 */
@Injectable()
export class RequestRepository {
  constructor(
    @InjectRepository(Request)
    private readonly repository: Repository<Request>,
  ) {}

  /**
   * Create a new request
   */
  async create(data: Partial<Request>): Promise<Request> {
    const request = this.repository.create({
      ...data,
      requestedAt: data.requestedAt || new Date(),
    });
    return await this.repository.save(request);
  }

  /**
   * Find request by ID with optional relations
   */
  async findById(id: string, relations: string[] = ['user', 'approver']): Promise<Request | null> {
    return await this.repository.findOne({
      where: { id },
      relations,
    });
  }

  /**
   * Find requests by user ID with optional filtering
   */
  async findByUserId(
    userId: string,
    type?: RequestType,
    status?: RequestStatus,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50,
  ): Promise<Request[]> {
    const query = this.repository.createQueryBuilder('request')
      .leftJoinAndSelect('request.approver', 'approver')
      .leftJoinAndSelect('request.createdAttendance', 'attendance')
      .where('request.userId = :userId', { userId })
      .orderBy('request.createdAt', 'DESC')
      .limit(limit);

    if (type) {
      query.andWhere('request.type = :type', { type });
    }

    if (status) {
      query.andWhere('request.status = :status', { status });
    }

    if (startDate && endDate) {
      query.andWhere('request.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    return await query.getMany();
  }

  /**
   * Find requests by type with optional filtering
   */
  async findByType(
    type: RequestType,
    status?: RequestStatus,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50,
  ): Promise<Request[]> {
    const query = this.repository.createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.approver', 'approver')
      .where('request.type = :type', { type })
      .orderBy('request.createdAt', 'DESC')
      .limit(limit);

    if (status) {
      query.andWhere('request.status = :status', { status });
    }

    if (startDate && endDate) {
      query.andWhere('request.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    return await query.getMany();
  }

  /**
   * Find pending requests for manager approval
   */
  async findPendingForManager(managerId: string, type?: RequestType): Promise<Request[]> {
    // Get team member IDs from reporting structure
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

    const query = this.repository.createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .where('request.userId IN (:...teamMemberIds)', { teamMemberIds })
      .andWhere('request.status = :status', { status: RequestStatus.PENDING })
      .orderBy('request.createdAt', 'ASC');

    if (type) {
      query.andWhere('request.type = :type', { type });
    }

    return await query.getMany();
  }

  /**
   * Find team requests for manager (all statuses)
   */
  async findTeamRequests(
    managerId: string,
    type?: RequestType,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Request[]> {
    // Get team member IDs from reporting structure
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

    const query = this.repository.createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.approver', 'approver')
      .where('request.userId IN (:...teamMemberIds)', { teamMemberIds })
      .orderBy('request.createdAt', 'DESC');

    if (type) {
      query.andWhere('request.type = :type', { type });
    }

    if (startDate && endDate) {
      query.andWhere('request.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    return await query.getMany();
  }

  /**
   * Update request
   */
  async update(id: string, data: Partial<Request>): Promise<Request> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated request');
    }
    return updated;
  }

  /**
   * Delete request
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Check if user has request for specific date and type
   */
  async hasRequestForDate(
    userId: string,
    type: RequestType,
    date: Date,
    status?: RequestStatus,
  ): Promise<boolean> {
    const query = this.repository.createQueryBuilder('request')
      .where('request.userId = :userId', { userId })
      .andWhere('request.type = :type', { type });

    if (status) {
      query.andWhere('request.status = :status', { status });
    }

    // Type-specific date checking
    switch (type) {
      case RequestType.LEAVE:
        query.andWhere(`
          (request.requestData->>'startDate')::date <= :date::date 
          AND (request.requestData->>'endDate')::date >= :date::date
        `, { date });
        break;
      case RequestType.REMOTE_WORK:
        query.andWhere(`(request.requestData->>'requestedDate')::date = :date::date`, { date });
        break;
      case RequestType.ATTENDANCE_CORRECTION:
        query.andWhere(`(request.requestData->>'requestedDate')::date = :date::date`, { date });
        break;
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Get request statistics for date range
   */
  async getRequestStats(
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
  }> {
    let query = this.repository.createQueryBuilder('request')
      .where('request.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (type) {
      query = query.andWhere('request.type = :type', { type });
    }

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
        return { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
      }

      query = query.andWhere('request.userId IN (:...teamMemberIds)', { teamMemberIds });
    }

    const requests = await query.getMany();

    return {
      total: requests.length,
      pending: requests.filter(r => r.status === RequestStatus.PENDING).length,
      approved: requests.filter(r => r.status === RequestStatus.APPROVED).length,
      rejected: requests.filter(r => r.status === RequestStatus.REJECTED).length,
      cancelled: requests.filter(r => r.status === RequestStatus.CANCELLED).length,
    };
  }

  /**
   * Find overlapping leave requests for a user
   */
  async findOverlappingLeaveRequests(
    userId: string,
    startDate: Date,
    endDate: Date,
    excludeRequestId?: string,
  ): Promise<Request[]> {
    const query = this.repository.createQueryBuilder('request')
      .where('request.userId = :userId', { userId })
      .andWhere('request.type = :type', { type: RequestType.LEAVE })
      .andWhere('request.status IN (:...statuses)', { 
        statuses: [RequestStatus.PENDING, RequestStatus.APPROVED] 
      })
      .andWhere(`
        (request.requestData->>'startDate')::date <= :endDate::date 
        AND (request.requestData->>'endDate')::date >= :startDate::date
      `, { startDate, endDate });

    if (excludeRequestId) {
      query.andWhere('request.id != :excludeRequestId', { excludeRequestId });
    }

    return await query.getMany();
  }

  /**
   * Find requests by user and date range for specific type
   */
  async findByUserAndDateRange(
    userId: string,
    type: RequestType,
    startDate: Date,
    endDate: Date,
  ): Promise<Request[]> {
    const query = this.repository.createQueryBuilder('request')
      .leftJoinAndSelect('request.approver', 'approver')
      .where('request.userId = :userId', { userId })
      .andWhere('request.type = :type', { type })
      .orderBy('request.createdAt', 'DESC');

    // Type-specific date filtering
    switch (type) {
      case RequestType.LEAVE:
        query.andWhere(`
          (request.requestData->>'startDate')::date >= :startDate::date 
          AND (request.requestData->>'endDate')::date <= :endDate::date
        `, { startDate, endDate });
        break;
      case RequestType.REMOTE_WORK:
      case RequestType.ATTENDANCE_CORRECTION:
        query.andWhere(`
          (request.requestData->>'requestedDate')::date >= :startDate::date 
          AND (request.requestData->>'requestedDate')::date <= :endDate::date
        `, { startDate, endDate });
        break;
    }

    return await query.getMany();
  }

  /**
   * Count requests by user, type and status
   */
  async countByUserTypeStatus(
    userId: string,
    type: RequestType,
    status: RequestStatus,
    year?: number,
  ): Promise<number> {
    const query = this.repository.createQueryBuilder('request')
      .where('request.userId = :userId', { userId })
      .andWhere('request.type = :type', { type })
      .andWhere('request.status = :status', { status });

    if (year) {
      query.andWhere('EXTRACT(YEAR FROM request.createdAt) = :year', { year });
    }

    return await query.getCount();
  }

  /**
   * Find overdue requests (past deadline and still pending)
   */
  async findOverdueRequests(type?: RequestType): Promise<Request[]> {
    const query = this.repository.createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .where('request.status = :status', { status: RequestStatus.PENDING });

    if (type) {
      query.andWhere('request.type = :type', { type });
    }

    // For attendance correction requests, check if past deadline
    if (type === RequestType.ATTENDANCE_CORRECTION || !type) {
      query.andWhere(`
        (request.type = :attendanceType AND 
         (request.requestData->>'requestDeadline')::timestamp < NOW())
        OR request.type != :attendanceType
      `, { attendanceType: RequestType.ATTENDANCE_CORRECTION });
    }

    return await query.getMany();
  }
}
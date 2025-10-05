import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { RemoteWorkRequest } from '../entities/remote-work-request.entity';

/**
 * Remote Work Request Repository - Data access layer for remote work requests
 * Provides CRUD operations and specialized queries for remote work management
 */
@Injectable()
export class RemoteWorkRequestRepository {
  constructor(
    @InjectRepository(RemoteWorkRequest)
    private readonly repository: Repository<RemoteWorkRequest>,
  ) {}

  /**
   * Create a new remote work request
   */
  async create(data: Partial<RemoteWorkRequest>): Promise<RemoteWorkRequest> {
    const request = this.repository.create(data);
    return await this.repository.save(request);
  }

  /**
   * Find remote work request by ID
   */
  async findById(id: string): Promise<RemoteWorkRequest | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['user', 'approver'],
    });
  }

  /**
   * Find remote work request by user and date
   */
  async findByUserIdAndDate(userId: string, date: Date): Promise<RemoteWorkRequest | null> {
    return await this.repository.findOne({
      where: { 
        userId,
        requestedDate: date,
      },
      relations: ['user', 'approver'],
    });
  }

  /**
   * Find user's remote work requests with date range
   */
  async findByUserIdAndDateRange(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<RemoteWorkRequest[]> {
    return await this.repository.find({
      where: {
        userId,
        requestedDate: Between(startDate, endDate),
      },
      relations: ['user', 'approver'],
      order: { requestedDate: 'DESC' },
    });
  }

  /**
   * Find all user's remote work requests
   */
  async findByUserId(userId: string): Promise<RemoteWorkRequest[]> {
    return await this.repository.find({
      where: { userId },
      relations: ['user', 'approver'],
      order: { requestedDate: 'DESC' },
    });
  }

  /**
   * Find pending requests for team members (for managers)
   */
  async findPendingByTeamMemberIds(teamMemberIds: string[]): Promise<RemoteWorkRequest[]> {
    if (teamMemberIds.length === 0) return [];

    return await this.repository.find({
      where: {
        userId: teamMemberIds as any, // TypeORM In operator
        status: 'PENDING',
      },
      relations: ['user', 'approver'],
      order: { requestedDate: 'ASC' },
    });
  }

  /**
   * Find all requests for team members (for managers)
   */
  async findByTeamMemberIds(
    teamMemberIds: string[], 
    startDate?: Date, 
    endDate?: Date
  ): Promise<RemoteWorkRequest[]> {
    if (teamMemberIds.length === 0) return [];

    const whereCondition: any = {
      userId: teamMemberIds as any, // TypeORM In operator
    };

    if (startDate && endDate) {
      whereCondition.requestedDate = Between(startDate, endDate);
    }

    return await this.repository.find({
      where: whereCondition,
      relations: ['user', 'approver'],
      order: { requestedDate: 'DESC' },
    });
  }

  /**
   * Update remote work request
   */
  async update(id: string, data: Partial<RemoteWorkRequest>): Promise<RemoteWorkRequest> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Remote work request with ID ${id} not found after update`);
    }
    return updated;
  }

  /**
   * Delete remote work request
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Check if user has pending request for date
   */
  async hasPendingRequestForDate(userId: string, date: Date): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        userId,
        requestedDate: date,
        status: 'PENDING',
      },
    });
    return count > 0;
  }

  /**
   * Check if user has approved request for date
   */
  async hasApprovedRequestForDate(userId: string, date: Date): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        userId,
        requestedDate: date,
        status: 'APPROVED',
      },
    });
    return count > 0;
  }

  /**
   * Get user's remote work statistics
   */
  async getUserRemoteWorkStats(userId: string, startDate: Date, endDate: Date): Promise<{
    totalRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    pendingRequests: number;
    approvalRate: number;
  }> {
    const requests = await this.findByUserIdAndDateRange(userId, startDate, endDate);
    
    const totalRequests = requests.length;
    const approvedRequests = requests.filter(r => r.status === 'APPROVED').length;
    const rejectedRequests = requests.filter(r => r.status === 'REJECTED').length;
    const pendingRequests = requests.filter(r => r.status === 'PENDING').length;
    const approvalRate = totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0;

    return {
      totalRequests,
      approvedRequests,
      rejectedRequests,
      pendingRequests,
      approvalRate: Math.round(approvalRate * 10) / 10,
    };
  }
}
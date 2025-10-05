import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveBalance } from '../entities/leave-balance.entity';

/**
 * Leave Balance Repository - Data access layer for leave balance operations
 * Provides CRUD operations and business-specific queries for leave balances
 */
@Injectable()
export class LeaveBalanceRepository {
  constructor(
    @InjectRepository(LeaveBalance)
    private readonly repository: Repository<LeaveBalance>,
  ) {}

  /**
   * Create a new leave balance record
   */
  async create(balanceData: Partial<LeaveBalance>): Promise<LeaveBalance> {
    const balance = this.repository.create(balanceData);
    return await this.repository.save(balance);
  }

  /**
   * Find leave balance by ID
   */
  async findById(id: string): Promise<LeaveBalance | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['leaveType'],
    });
  }

  /**
   * Find leave balance by user, leave type, and year
   */
  async findByUserLeaveTypeYear(
    userId: string,
    leaveTypeId: string,
    year: number
  ): Promise<LeaveBalance | null> {
    return await this.repository.findOne({
      where: { userId, leaveTypeId, year },
      relations: ['leaveType'],
    });
  }

  /**
   * Find all leave balances for a user in a specific year
   */
  async findByUserAndYear(userId: string, year: number): Promise<LeaveBalance[]> {
    return await this.repository.find({
      where: { userId, year },
      relations: ['leaveType'],
      order: { leaveType: { name: 'ASC' } },
    });
  }

  /**
   * Find all leave balances for a user (all years)
   */
  async findByUserId(userId: string): Promise<LeaveBalance[]> {
    return await this.repository.find({
      where: { userId },
      relations: ['leaveType'],
      order: { year: 'DESC', leaveType: { name: 'ASC' } },
    });
  }

  /**
   * Update leave balance
   */
  async update(id: string, updateData: Partial<LeaveBalance>): Promise<LeaveBalance> {
    await this.repository.update(id, updateData);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Leave balance not found after update');
    }
    return updated;
  }

  /**
   * Update or create leave balance (upsert)
   */
  async upsert(
    userId: string,
    leaveTypeId: string,
    year: number,
    updateData: Partial<LeaveBalance>
  ): Promise<LeaveBalance> {
    const existing = await this.findByUserLeaveTypeYear(userId, leaveTypeId, year);
    
    if (existing) {
      return await this.update(existing.id, updateData);
    } else {
      return await this.create({
        userId,
        leaveTypeId,
        year,
        ...updateData,
      });
    }
  }

  /**
   * Increment used days for a leave balance
   */
  async incrementUsedDays(
    userId: string,
    leaveTypeId: string,
    year: number,
    days: number
  ): Promise<LeaveBalance> {
    const balance = await this.findByUserLeaveTypeYear(userId, leaveTypeId, year);
    if (!balance) {
      throw new Error('Leave balance not found');
    }

    balance.usedDays += days;
    return await this.repository.save(balance);
  }

  /**
   * Decrement used days for a leave balance (when leave is cancelled/rejected)
   */
  async decrementUsedDays(
    userId: string,
    leaveTypeId: string,
    year: number,
    days: number
  ): Promise<LeaveBalance> {
    const balance = await this.findByUserLeaveTypeYear(userId, leaveTypeId, year);
    if (!balance) {
      throw new Error('Leave balance not found');
    }

    balance.usedDays = Math.max(0, balance.usedDays - days);
    return await this.repository.save(balance);
  }

  /**
   * Update pending days for a leave balance
   */
  async updatePendingDays(
    userId: string,
    leaveTypeId: string,
    year: number,
    pendingDays: number
  ): Promise<LeaveBalance> {
    const balance = await this.findByUserLeaveTypeYear(userId, leaveTypeId, year);
    if (!balance) {
      // Create new balance if it doesn't exist
      return await this.create({
        userId,
        leaveTypeId,
        year,
        allocatedDays: 0,
        usedDays: 0,
        carriedForwardDays: 0,
        pendingDays,
      });
    }

    balance.pendingDays = pendingDays;
    return await this.repository.save(balance);
  }

  /**
   * Get leave balance summary for a user
   */
  async getBalanceSummary(userId: string, year: number): Promise<any> {
    const balances = await this.findByUserAndYear(userId, year);
    
    return balances.map(balance => ({
      leaveType: {
        id: balance.leaveType.id,
        name: balance.leaveType.name,
        maxDaysPerYear: balance.leaveType.maxDaysPerYear,
      },
      allocatedDays: balance.allocatedDays,
      usedDays: balance.usedDays,
      carriedForwardDays: balance.carriedForwardDays,
      pendingDays: balance.pendingDays,
      remainingDays: balance.remainingDays,
      totalAvailableDays: balance.totalAvailableDays,
    }));
  }

  /**
   * Initialize leave balances for a new user
   */
  async initializeUserBalances(userId: string, year: number, leaveTypes: any[]): Promise<LeaveBalance[]> {
    const balances: LeaveBalance[] = [];
    
    for (const leaveType of leaveTypes) {
      const balance = await this.create({
        userId,
        leaveTypeId: leaveType.id,
        year,
        allocatedDays: leaveType.maxDaysPerYear,
        usedDays: 0,
        carriedForwardDays: 0,
        pendingDays: 0,
      });
      balances.push(balance);
    }
    
    return balances;
  }

  /**
   * Process year-end carry forward for all users
   */
  async processYearEndCarryForward(fromYear: number, toYear: number): Promise<void> {
    // Get all balances from the previous year that can carry forward
    const previousYearBalances = await this.repository
      .createQueryBuilder('balance')
      .leftJoinAndSelect('balance.leaveType', 'leaveType')
      .where('balance.year = :fromYear', { fromYear })
      .andWhere('leaveType.can_carry_forward = true')
      .andWhere('balance.allocated_days + balance.carried_forward_days - balance.used_days > 0')
      .getMany();

    for (const prevBalance of previousYearBalances) {
      const remainingDays = prevBalance.remainingDays;
      const carryForwardDays = Math.min(
        remainingDays,
        prevBalance.leaveType.maxCarryForwardDays
      );

      if (carryForwardDays > 0) {
        await this.upsert(
          prevBalance.userId,
          prevBalance.leaveTypeId,
          toYear,
          {
            allocatedDays: prevBalance.leaveType.maxDaysPerYear,
            carriedForwardDays: carryForwardDays,
            usedDays: 0,
            pendingDays: 0,
          }
        );
      }
    }
  }

  /**
   * Delete leave balance
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
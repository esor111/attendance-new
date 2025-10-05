import { Injectable, NotFoundException } from '@nestjs/common';
import { LeaveBalanceRepository } from '../repositories/leave-balance.repository';
import { LeaveTypeRepository } from '../repositories/leave-type.repository';
import { LeaveRequestRepository } from '../repositories/leave-request.repository';
import { LeaveBalance } from '../entities/leave-balance.entity';
import { LeaveRequestStatus } from '../entities/leave-request.entity';

/**
 * Leave Balance Service - Manages leave balance calculations and year-end processing
 * Handles automatic balance calculations, carry forward rules, and balance initialization
 */
@Injectable()
export class LeaveBalanceService {
  constructor(
    private readonly leaveBalanceRepository: LeaveBalanceRepository,
    private readonly leaveTypeRepository: LeaveTypeRepository,
    private readonly leaveRequestRepository: LeaveRequestRepository,
  ) {}

  /**
   * Get leave balances for a user in a specific year
   */
  async getUserLeaveBalances(userId: string, year?: number): Promise<LeaveBalance[]> {
    const targetYear = year || new Date().getFullYear();
    
    // Get existing balances
    let balances = await this.leaveBalanceRepository.findByUserAndYear(userId, targetYear);
    
    // If no balances exist for this year, initialize them
    if (balances.length === 0) {
      balances = await this.initializeUserBalances(userId, targetYear);
    }
    
    return balances;
  }

  /**
   * Get leave balance summary for a user
   */
  async getBalanceSummary(userId: string, year?: number): Promise<any> {
    const targetYear = year || new Date().getFullYear();
    return await this.leaveBalanceRepository.getBalanceSummary(userId, targetYear);
  }

  /**
   * Initialize leave balances for a new user or new year
   */
  async initializeUserBalances(userId: string, year: number): Promise<LeaveBalance[]> {
    const activeLeaveTypes = await this.leaveTypeRepository.findAllActive();
    
    if (activeLeaveTypes.length === 0) {
      return [];
    }

    return await this.leaveBalanceRepository.initializeUserBalances(userId, year, activeLeaveTypes);
  }

  /**
   * Update pending days for a leave balance
   */
  async updatePendingDays(
    userId: string,
    leaveTypeId: string,
    year: number,
    days: number,
    operation: 'add' | 'subtract'
  ): Promise<LeaveBalance> {
    const balance = await this.leaveBalanceRepository.findByUserLeaveTypeYear(
      userId,
      leaveTypeId,
      year
    );

    if (!balance) {
      // Create balance if it doesn't exist
      const leaveType = await this.leaveTypeRepository.findById(leaveTypeId);
      if (!leaveType) {
        throw new NotFoundException('Leave type not found');
      }

      return await this.leaveBalanceRepository.create({
        userId,
        leaveTypeId,
        year,
        allocatedDays: leaveType.maxDaysPerYear,
        usedDays: 0,
        carriedForwardDays: 0,
        pendingDays: operation === 'add' ? days : 0,
      });
    }

    const newPendingDays = operation === 'add' 
      ? balance.pendingDays + days 
      : Math.max(0, balance.pendingDays - days);

    return await this.leaveBalanceRepository.updatePendingDays(
      userId,
      leaveTypeId,
      year,
      newPendingDays
    );
  }

  /**
   * Update used days for a leave balance
   */
  async updateUsedDays(
    userId: string,
    leaveTypeId: string,
    year: number,
    days: number,
    operation: 'add' | 'subtract'
  ): Promise<LeaveBalance> {
    if (operation === 'add') {
      return await this.leaveBalanceRepository.incrementUsedDays(userId, leaveTypeId, year, days);
    } else {
      return await this.leaveBalanceRepository.decrementUsedDays(userId, leaveTypeId, year, days);
    }
  }

  /**
   * Recalculate leave balance based on approved leave requests
   */
  async recalculateBalance(userId: string, leaveTypeId: string, year: number): Promise<LeaveBalance> {
    // Get all approved leave requests for this user, leave type, and year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    const approvedRequests = await this.leaveRequestRepository.findApprovedRequestsInRange(
      userId,
      startDate,
      endDate
    );

    // Calculate total used days from approved requests
    const usedDays = approvedRequests
      .filter(request => request.leaveTypeId === leaveTypeId)
      .reduce((total, request) => total + request.daysRequested, 0);

    // Get pending requests
    const pendingRequests = await this.leaveRequestRepository.findPendingByUserAndLeaveType(
      userId,
      leaveTypeId
    );

    const pendingDays = pendingRequests
      .filter(request => request.startDate.getFullYear() === year)
      .reduce((total, request) => total + request.daysRequested, 0);

    // Update the balance
    const balance = await this.leaveBalanceRepository.findByUserLeaveTypeYear(
      userId,
      leaveTypeId,
      year
    );

    if (!balance) {
      throw new NotFoundException('Leave balance not found');
    }

    return await this.leaveBalanceRepository.update(balance.id, {
      usedDays,
      pendingDays,
    });
  }

  /**
   * Process year-end carry forward for all users
   */
  async processYearEndCarryForward(fromYear: number, toYear: number): Promise<void> {
    await this.leaveBalanceRepository.processYearEndCarryForward(fromYear, toYear);
  }

  /**
   * Allocate additional leave days to a user
   */
  async allocateAdditionalDays(
    userId: string,
    leaveTypeId: string,
    year: number,
    additionalDays: number,
    reason?: string
  ): Promise<LeaveBalance> {
    const balance = await this.leaveBalanceRepository.findByUserLeaveTypeYear(
      userId,
      leaveTypeId,
      year
    );

    if (!balance) {
      throw new NotFoundException('Leave balance not found');
    }

    const newAllocatedDays = balance.allocatedDays + additionalDays;

    // Log the allocation (placeholder for audit trail)
    console.log(`Allocated ${additionalDays} additional days to user ${userId} for leave type ${leaveTypeId} in ${year}. Reason: ${reason || 'Not specified'}`);

    return await this.leaveBalanceRepository.update(balance.id, {
      allocatedDays: newAllocatedDays,
    });
  }

  /**
   * Get leave balance trends for a user
   */
  async getBalanceTrends(userId: string, years: number[]): Promise<any> {
    const trends: any = {};

    for (const year of years) {
      const balances = await this.leaveBalanceRepository.findByUserAndYear(userId, year);
      trends[year] = balances.map(balance => ({
        leaveType: balance.leaveType.name,
        allocated: balance.allocatedDays,
        used: balance.usedDays,
        remaining: balance.remainingDays,
        utilizationRate: balance.allocatedDays > 0 
          ? (balance.usedDays / balance.allocatedDays) * 100 
          : 0,
      }));
    }

    return trends;
  }

  /**
   * Check if user has sufficient balance for a leave request
   */
  async hasSufficientBalance(
    userId: string,
    leaveTypeId: string,
    year: number,
    daysRequested: number
  ): Promise<{ sufficient: boolean; available: number; requested: number }> {
    const balance = await this.leaveBalanceRepository.findByUserLeaveTypeYear(
      userId,
      leaveTypeId,
      year
    );

    if (!balance) {
      return {
        sufficient: false,
        available: 0,
        requested: daysRequested,
      };
    }

    return {
      sufficient: balance.remainingDays >= daysRequested,
      available: balance.remainingDays,
      requested: daysRequested,
    };
  }

  /**
   * Get team leave balance summary for managers
   */
  async getTeamBalanceSummary(managerId: string, year: number): Promise<any> {
    // This would require integration with reporting structure
    // For now, return placeholder
    return {
      managerId,
      year,
      teamSummary: {
        totalEmployees: 0,
        averageUtilization: 0,
        totalDaysAllocated: 0,
        totalDaysUsed: 0,
        totalDaysRemaining: 0,
      },
      leaveTypeBreakdown: [],
    };
  }

  /**
   * Generate leave balance report
   */
  async generateBalanceReport(userId: string, year: number): Promise<any> {
    const balances = await this.getUserLeaveBalances(userId, year);
    const statistics = await this.leaveRequestRepository.getRequestStatistics(userId, year);

    return {
      userId,
      year,
      generatedAt: new Date(),
      balances: balances.map(balance => ({
        leaveType: {
          id: balance.leaveType.id,
          name: balance.leaveType.name,
        },
        allocated: balance.allocatedDays,
        used: balance.usedDays,
        pending: balance.pendingDays,
        remaining: balance.remainingDays,
        carriedForward: balance.carriedForwardDays,
        utilizationRate: balance.allocatedDays > 0 
          ? Math.round((balance.usedDays / balance.allocatedDays) * 100) 
          : 0,
      })),
      requestStatistics: statistics,
    };
  }

  /**
   * Bulk update leave balances (for admin operations)
   */
  async bulkUpdateBalances(updates: Array<{
    userId: string;
    leaveTypeId: string;
    year: number;
    allocatedDays?: number;
    usedDays?: number;
    carriedForwardDays?: number;
  }>): Promise<void> {
    for (const update of updates) {
      await this.leaveBalanceRepository.upsert(
        update.userId,
        update.leaveTypeId,
        update.year,
        {
          allocatedDays: update.allocatedDays,
          usedDays: update.usedDays,
          carriedForwardDays: update.carriedForwardDays,
        }
      );
    }
  }
}
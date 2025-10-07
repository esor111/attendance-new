import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Request, RequestType, RequestStatus } from '../entities/request.entity';
import { AttendanceRequest } from '../entities/attendance-request.entity';
import { RemoteWorkRequest } from '../entities/remote-work-request.entity';
import { LeaveRequest } from '../../leave/entities/leave-request.entity';

/**
 * Data Migration Service - Consolidates existing request data into unified Request table
 * Migrates data from AttendanceRequest, RemoteWorkRequest, and LeaveRequest tables
 * Preserves all existing data and maintains referential integrity
 */
@Injectable()
export class ConsolidateRequestsMigration {
  private readonly logger = new Logger(ConsolidateRequestsMigration.name);

  constructor(
    @InjectRepository(Request)
    private readonly requestRepository: Repository<Request>,
    @InjectRepository(AttendanceRequest)
    private readonly attendanceRequestRepository: Repository<AttendanceRequest>,
    @InjectRepository(RemoteWorkRequest)
    private readonly remoteWorkRequestRepository: Repository<RemoteWorkRequest>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Execute the complete migration process
   */
  async executeMigration(): Promise<{
    success: boolean;
    migratedCounts: {
      attendanceRequests: number;
      remoteWorkRequests: number;
      leaveRequests: number;
      total: number;
    };
    errors: string[];
  }> {
    const errors: string[] = [];
    let attendanceCount = 0;
    let remoteWorkCount = 0;
    let leaveCount = 0;

    this.logger.log('Starting request consolidation migration...');

    // Use transaction to ensure data integrity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Migrate attendance requests
      this.logger.log('Migrating attendance requests...');
      attendanceCount = await this.migrateAttendanceRequests(queryRunner);
      this.logger.log(`Migrated ${attendanceCount} attendance requests`);

      // Migrate remote work requests
      this.logger.log('Migrating remote work requests...');
      remoteWorkCount = await this.migrateRemoteWorkRequests(queryRunner);
      this.logger.log(`Migrated ${remoteWorkCount} remote work requests`);

      // Migrate leave requests
      this.logger.log('Migrating leave requests...');
      leaveCount = await this.migrateLeaveRequests(queryRunner);
      this.logger.log(`Migrated ${leaveCount} leave requests`);

      // Validate migration
      await this.validateMigration(queryRunner);

      await queryRunner.commitTransaction();
      this.logger.log('Migration completed successfully');

      return {
        success: true,
        migratedCounts: {
          attendanceRequests: attendanceCount,
          remoteWorkRequests: remoteWorkCount,
          leaveRequests: leaveCount,
          total: attendanceCount + remoteWorkCount + leaveCount,
        },
        errors,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      this.logger.error('Migration failed:', error);

      return {
        success: false,
        migratedCounts: {
          attendanceRequests: 0,
          remoteWorkRequests: 0,
          leaveRequests: 0,
          total: 0,
        },
        errors,
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Migrate attendance requests to unified table
   */
  private async migrateAttendanceRequests(queryRunner: any): Promise<number> {
    const attendanceRequests = await queryRunner.manager.find(AttendanceRequest);
    let migratedCount = 0;

    for (const attendanceRequest of attendanceRequests) {
      try {
        const unifiedRequest = queryRunner.manager.create(Request, {
          id: attendanceRequest.id, // Preserve original ID
          userId: attendanceRequest.userId,
          type: RequestType.ATTENDANCE_CORRECTION,
          requestData: {
            requestedDate: attendanceRequest.requestedDate.toISOString().split('T')[0],
            reason: attendanceRequest.reason,
            requestDeadline: attendanceRequest.requestDeadline?.toISOString(),
          },
          status: this.mapAttendanceRequestStatus(attendanceRequest.status),
          approverId: attendanceRequest.approverId,
          approvedAt: attendanceRequest.approvalDate,
          approvalNotes: attendanceRequest.approvalNotes,
          requestedAt: attendanceRequest.createdAt,
          createdAttendanceId: attendanceRequest.createdAttendanceId,
          createdAt: attendanceRequest.createdAt,
          updatedAt: attendanceRequest.updatedAt,
        });

        await queryRunner.manager.save(Request, unifiedRequest);
        migratedCount++;
      } catch (error) {
        this.logger.error(`Failed to migrate attendance request ${attendanceRequest.id}:`, error);
        throw error;
      }
    }

    return migratedCount;
  }

  /**
   * Migrate remote work requests to unified table
   */
  private async migrateRemoteWorkRequests(queryRunner: any): Promise<number> {
    const remoteWorkRequests = await queryRunner.manager.find(RemoteWorkRequest);
    let migratedCount = 0;

    for (const remoteWorkRequest of remoteWorkRequests) {
      try {
        const unifiedRequest = queryRunner.manager.create(Request, {
          id: remoteWorkRequest.id, // Preserve original ID
          userId: remoteWorkRequest.userId,
          type: RequestType.REMOTE_WORK,
          requestData: {
            requestedDate: remoteWorkRequest.requestedDate.toISOString().split('T')[0],
            reason: remoteWorkRequest.reason,
            remoteLocation: remoteWorkRequest.remoteLocation,
            notes: remoteWorkRequest.notes,
          },
          status: this.mapRemoteWorkRequestStatus(remoteWorkRequest.status),
          approverId: remoteWorkRequest.approverId,
          approvedAt: remoteWorkRequest.approvedAt,
          approvalNotes: remoteWorkRequest.approvalNotes,
          requestedAt: remoteWorkRequest.requestedAt,
          notes: remoteWorkRequest.notes,
          createdAt: remoteWorkRequest.createdAt,
          updatedAt: remoteWorkRequest.updatedAt,
        });

        await queryRunner.manager.save(Request, unifiedRequest);
        migratedCount++;
      } catch (error) {
        this.logger.error(`Failed to migrate remote work request ${remoteWorkRequest.id}:`, error);
        throw error;
      }
    }

    return migratedCount;
  }

  /**
   * Migrate leave requests to unified table
   */
  private async migrateLeaveRequests(queryRunner: any): Promise<number> {
    const leaveRequests = await queryRunner.manager.find(LeaveRequest);
    let migratedCount = 0;

    for (const leaveRequest of leaveRequests) {
      try {
        const unifiedRequest = queryRunner.manager.create(Request, {
          id: leaveRequest.id, // Preserve original ID
          userId: leaveRequest.userId,
          type: RequestType.LEAVE,
          requestData: {
            leaveType: leaveRequest.leaveType,
            startDate: leaveRequest.startDate.toISOString().split('T')[0],
            endDate: leaveRequest.endDate.toISOString().split('T')[0],
            daysRequested: leaveRequest.daysRequested,
            reason: leaveRequest.reason,
            isEmergency: leaveRequest.isEmergency,
            emergencyJustification: leaveRequest.emergencyJustification,
            balanceInfo: leaveRequest.balanceInfo,
          },
          status: this.mapLeaveRequestStatus(leaveRequest.status),
          approverId: leaveRequest.approverId,
          approvedAt: leaveRequest.approvedAt,
          approvalNotes: leaveRequest.approvalComments,
          rejectionReason: leaveRequest.rejectionReason,
          requestedAt: leaveRequest.createdAt,
          createdAt: leaveRequest.createdAt,
          updatedAt: leaveRequest.updatedAt,
        });

        await queryRunner.manager.save(Request, unifiedRequest);
        migratedCount++;
      } catch (error) {
        this.logger.error(`Failed to migrate leave request ${leaveRequest.id}:`, error);
        throw error;
      }
    }

    return migratedCount;
  }

  /**
   * Validate migration by comparing counts and data integrity
   */
  private async validateMigration(queryRunner: any): Promise<void> {
    // Count original records
    const originalAttendanceCount = await queryRunner.manager.count(AttendanceRequest);
    const originalRemoteWorkCount = await queryRunner.manager.count(RemoteWorkRequest);
    const originalLeaveCount = await queryRunner.manager.count(LeaveRequest);
    const originalTotal = originalAttendanceCount + originalRemoteWorkCount + originalLeaveCount;

    // Count migrated records
    const migratedAttendanceCount = await queryRunner.manager.count(Request, { 
      where: { type: RequestType.ATTENDANCE_CORRECTION } 
    });
    const migratedRemoteWorkCount = await queryRunner.manager.count(Request, { 
      where: { type: RequestType.REMOTE_WORK } 
    });
    const migratedLeaveCount = await queryRunner.manager.count(Request, { 
      where: { type: RequestType.LEAVE } 
    });
    const migratedTotal = migratedAttendanceCount + migratedRemoteWorkCount + migratedLeaveCount;

    // Validate counts match
    if (originalTotal !== migratedTotal) {
      throw new Error(
        `Migration validation failed: Original count (${originalTotal}) does not match migrated count (${migratedTotal})`
      );
    }

    if (originalAttendanceCount !== migratedAttendanceCount) {
      throw new Error(
        `Attendance request migration validation failed: Original (${originalAttendanceCount}) vs Migrated (${migratedAttendanceCount})`
      );
    }

    if (originalRemoteWorkCount !== migratedRemoteWorkCount) {
      throw new Error(
        `Remote work request migration validation failed: Original (${originalRemoteWorkCount}) vs Migrated (${migratedRemoteWorkCount})`
      );
    }

    if (originalLeaveCount !== migratedLeaveCount) {
      throw new Error(
        `Leave request migration validation failed: Original (${originalLeaveCount}) vs Migrated (${migratedLeaveCount})`
      );
    }

    this.logger.log(`Migration validation passed: ${migratedTotal} records migrated successfully`);
  }

  /**
   * Map attendance request status to unified status
   */
  private mapAttendanceRequestStatus(status: string): RequestStatus {
    switch (status) {
      case 'PENDING':
        return RequestStatus.PENDING;
      case 'APPROVED':
        return RequestStatus.APPROVED;
      case 'REJECTED':
        return RequestStatus.REJECTED;
      default:
        return RequestStatus.PENDING;
    }
  }

  /**
   * Map remote work request status to unified status
   */
  private mapRemoteWorkRequestStatus(status: string): RequestStatus {
    switch (status) {
      case 'PENDING':
        return RequestStatus.PENDING;
      case 'APPROVED':
        return RequestStatus.APPROVED;
      case 'REJECTED':
        return RequestStatus.REJECTED;
      case 'CANCELLED':
        return RequestStatus.CANCELLED;
      default:
        return RequestStatus.PENDING;
    }
  }

  /**
   * Map leave request status to unified status
   */
  private mapLeaveRequestStatus(status: string): RequestStatus {
    switch (status) {
      case 'PENDING':
        return RequestStatus.PENDING;
      case 'APPROVED':
        return RequestStatus.APPROVED;
      case 'REJECTED':
        return RequestStatus.REJECTED;
      case 'CANCELLED':
        return RequestStatus.CANCELLED;
      default:
        return RequestStatus.PENDING;
    }
  }

  /**
   * Rollback migration (for testing or emergency rollback)
   */
  async rollbackMigration(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    this.logger.log('Starting migration rollback...');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete all migrated records from unified table
      await queryRunner.manager.delete(Request, {});
      
      await queryRunner.commitTransaction();
      this.logger.log('Migration rollback completed successfully');

      return { success: true, errors };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      this.logger.error('Migration rollback failed:', error);

      return { success: false, errors };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get migration status and statistics
   */
  async getMigrationStatus(): Promise<{
    originalCounts: {
      attendanceRequests: number;
      remoteWorkRequests: number;
      leaveRequests: number;
      total: number;
    };
    migratedCounts: {
      attendanceRequests: number;
      remoteWorkRequests: number;
      leaveRequests: number;
      total: number;
    };
    migrationComplete: boolean;
  }> {
    // Count original records
    const originalAttendanceCount = await this.attendanceRequestRepository.count();
    const originalRemoteWorkCount = await this.remoteWorkRequestRepository.count();
    const originalLeaveCount = await this.leaveRequestRepository.count();

    // Count migrated records
    const migratedAttendanceCount = await this.requestRepository.count({ 
      where: { type: RequestType.ATTENDANCE_CORRECTION } 
    });
    const migratedRemoteWorkCount = await this.requestRepository.count({ 
      where: { type: RequestType.REMOTE_WORK } 
    });
    const migratedLeaveCount = await this.requestRepository.count({ 
      where: { type: RequestType.LEAVE } 
    });

    const originalTotal = originalAttendanceCount + originalRemoteWorkCount + originalLeaveCount;
    const migratedTotal = migratedAttendanceCount + migratedRemoteWorkCount + migratedLeaveCount;

    return {
      originalCounts: {
        attendanceRequests: originalAttendanceCount,
        remoteWorkRequests: originalRemoteWorkCount,
        leaveRequests: originalLeaveCount,
        total: originalTotal,
      },
      migratedCounts: {
        attendanceRequests: migratedAttendanceCount,
        remoteWorkRequests: migratedRemoteWorkCount,
        leaveRequests: migratedLeaveCount,
        total: migratedTotal,
      },
      migrationComplete: originalTotal > 0 && originalTotal === migratedTotal,
    };
  }
}
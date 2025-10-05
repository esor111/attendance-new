import { Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

/**
 * Transaction Manager Service - Handles complex attendance operations with transaction support
 * Provides race condition prevention and data consistency for concurrent operations
 * Requirements: 9.1, 9.2, 9.6, 9.7
 */
@Injectable()
export class TransactionManagerService {
  private readonly logger = new Logger(TransactionManagerService.name);
  private readonly activeLocks = new Map<string, Promise<any>>();

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Execute operation with transaction and concurrent operation protection
   * Prevents race conditions by using user-based locking
   */
  async executeWithLock<T>(
    userId: string,
    operation: (queryRunner: QueryRunner) => Promise<T>,
    operationType: string = 'attendance_operation',
  ): Promise<T> {
    const lockKey = `${userId}_${operationType}`;
    
    // Check if there's already an operation in progress for this user
    if (this.activeLocks.has(lockKey)) {
      this.logger.warn(`Concurrent ${operationType} detected for user ${userId}, waiting for completion`);
      await this.activeLocks.get(lockKey);
    }

    // Create new operation promise
    const operationPromise = this.executeTransaction(operation, lockKey);
    this.activeLocks.set(lockKey, operationPromise);

    try {
      const result = await operationPromise;
      return result;
    } finally {
      // Clean up lock after operation completes
      this.activeLocks.delete(lockKey);
    }
  }

  /**
   * Execute operation within a database transaction
   */
  private async executeTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>,
    lockKey: string,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.debug(`Starting transaction for ${lockKey}`);
      
      const result = await operation(queryRunner);
      
      await queryRunner.commitTransaction();
      this.logger.debug(`Transaction committed successfully for ${lockKey}`);
      
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Transaction rolled back for ${lockKey}:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Execute clock-in operation with transaction and validation
   */
  async executeClockIn(
    userId: string,
    clockInData: any,
    validationFn: (queryRunner: QueryRunner) => Promise<void>,
  ): Promise<any> {
    return this.executeWithLock(
      userId,
      async (queryRunner) => {
        // Validate operation within transaction
        await validationFn(queryRunner);

        // Check for existing attendance record within transaction
        const existingAttendance = await queryRunner.manager
          .createQueryBuilder()
          .select('attendance')
          .from('daily_attendance', 'attendance')
          .where('attendance.user_id = :userId', { userId })
          .andWhere('attendance.date = :date', { date: clockInData.date })
          .getOne();

        if (existingAttendance && existingAttendance.clock_in_time) {
          throw new Error('Already clocked in for today');
        }

        // Create or update attendance record
        if (existingAttendance) {
          await queryRunner.manager
            .createQueryBuilder()
            .update('daily_attendance')
            .set({
              clock_in_time: clockInData.clockInTime,
              clock_in_latitude: clockInData.clockInLatitude,
              clock_in_longitude: clockInData.clockInLongitude,
              entity_id: clockInData.entityId,
              is_within_radius: clockInData.isWithinRadius,
              is_flagged: clockInData.isFlagged,
              flag_reason: clockInData.flagReason,
              notes: clockInData.notes,
              status: clockInData.status,
              updated_at: new Date(),
            })
            .where('id = :id', { id: existingAttendance.id })
            .execute();

          return { ...existingAttendance, ...clockInData };
        } else {
          const result = await queryRunner.manager
            .createQueryBuilder()
            .insert()
            .into('daily_attendance')
            .values({
              id: clockInData.id,
              user_id: userId,
              date: clockInData.date,
              clock_in_time: clockInData.clockInTime,
              clock_in_latitude: clockInData.clockInLatitude,
              clock_in_longitude: clockInData.clockInLongitude,
              entity_id: clockInData.entityId,
              is_within_radius: clockInData.isWithinRadius,
              is_flagged: clockInData.isFlagged,
              flag_reason: clockInData.flagReason,
              notes: clockInData.notes,
              status: clockInData.status,
              created_at: new Date(),
              updated_at: new Date(),
            })
            .execute();

          return { id: result.identifiers[0].id, ...clockInData };
        }
      },
      'clock_in',
    );
  }

  /**
   * Execute clock-out operation with transaction and validation
   */
  async executeClockOut(
    userId: string,
    clockOutData: any,
    validationFn: (queryRunner: QueryRunner, attendance: any) => Promise<void>,
  ): Promise<any> {
    return this.executeWithLock(
      userId,
      async (queryRunner) => {
        // Get current attendance record within transaction
        const attendance = await queryRunner.manager
          .createQueryBuilder()
          .select('attendance')
          .from('daily_attendance', 'attendance')
          .where('attendance.user_id = :userId', { userId })
          .andWhere('attendance.date = :date', { date: clockOutData.date })
          .getOne();

        if (!attendance) {
          throw new Error('No attendance record found for today');
        }

        if (!attendance.clock_in_time) {
          throw new Error('Must clock-in before clocking out');
        }

        if (attendance.clock_out_time) {
          throw new Error('Already clocked out for today');
        }

        // Validate operation within transaction
        await validationFn(queryRunner, attendance);

        // Update attendance record
        await queryRunner.manager
          .createQueryBuilder()
          .update('daily_attendance')
          .set({
            clock_out_time: clockOutData.clockOutTime,
            clock_out_latitude: clockOutData.clockOutLatitude,
            clock_out_longitude: clockOutData.clockOutLongitude,
            total_hours: clockOutData.totalHours,
            travel_speed_kmph: clockOutData.travelSpeedKmph,
            is_flagged: clockOutData.isFlagged,
            flag_reason: clockOutData.flagReason,
            notes: clockOutData.notes,
            updated_at: new Date(),
          })
          .where('id = :id', { id: attendance.id })
          .execute();

        return { ...attendance, ...clockOutData };
      },
      'clock_out',
    );
  }

  /**
   * Execute session check-in operation with transaction
   */
  async executeSessionCheckIn(
    userId: string,
    sessionData: any,
    validationFn: (queryRunner: QueryRunner, attendance: any) => Promise<void>,
  ): Promise<any> {
    return this.executeWithLock(
      userId,
      async (queryRunner) => {
        // Get attendance record within transaction
        const attendance = await queryRunner.manager
          .createQueryBuilder()
          .select('attendance')
          .from('daily_attendance', 'attendance')
          .where('attendance.user_id = :userId', { userId })
          .andWhere('attendance.date = :date', { date: sessionData.date })
          .getOne();

        if (!attendance || !attendance.clock_in_time) {
          throw new Error('Must clock-in for daily attendance before starting a session');
        }

        // Check for active session within transaction
        const activeSession = await queryRunner.manager
          .createQueryBuilder()
          .select('session')
          .from('attendance_sessions', 'session')
          .where('session.attendance_id = :attendanceId', { attendanceId: attendance.id })
          .andWhere('session.check_out_time IS NULL')
          .getOne();

        if (activeSession) {
          throw new Error('Already have an active session. Please check out first.');
        }

        // Validate operation within transaction
        await validationFn(queryRunner, attendance);

        // Create session record
        const result = await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into('attendance_sessions')
          .values({
            id: sessionData.id,
            attendance_id: attendance.id,
            check_in_time: sessionData.checkInTime,
            check_in_latitude: sessionData.checkInLatitude,
            check_in_longitude: sessionData.checkInLongitude,
            is_within_radius: sessionData.isWithinRadius,
            session_type: sessionData.sessionType,
            notes: sessionData.notes,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .execute();

        return { id: result.identifiers[0].id, ...sessionData };
      },
      'session_check_in',
    );
  }

  /**
   * Validate referential integrity within transaction
   */
  async validateReferentialIntegrity(
    queryRunner: QueryRunner,
    userId: string,
    entityId?: string,
  ): Promise<void> {
    // Validate user exists (in a real implementation, this might check external service)
    const userExists = await queryRunner.manager
      .createQueryBuilder()
      .select('COUNT(*)')
      .from('daily_attendance', 'attendance')
      .where('attendance.user_id = :userId', { userId })
      .getRawOne();

    if (!userExists || parseInt(userExists.count) === 0) {
      // In a real implementation, we might call the handshake service here
      this.logger.warn(`User ${userId} has no attendance history, may need handshake`);
    }

    // Validate entity exists if provided
    if (entityId) {
      const entityExists = await queryRunner.manager
        .createQueryBuilder()
        .select('entity')
        .from('entities', 'entity')
        .where('entity.id = :entityId', { entityId })
        .getOne();

      if (!entityExists) {
        throw new Error(`Entity ${entityId} does not exist`);
      }
    }
  }

  /**
   * Get current active locks for monitoring
   */
  getActiveLocks(): string[] {
    return Array.from(this.activeLocks.keys());
  }

  /**
   * Clear all locks (for testing or emergency situations)
   */
  clearAllLocks(): void {
    this.activeLocks.clear();
    this.logger.warn('All transaction locks cleared');
  }
}
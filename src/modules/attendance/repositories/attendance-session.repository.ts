import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { AttendanceSession } from '../entities/attendance-session.entity';

/**
 * Attendance Session Repository - Handles database operations for attendance sessions
 * Manages break, meeting, and other session tracking during workday
 */
@Injectable()
export class AttendanceSessionRepository {
  constructor(
    @InjectRepository(AttendanceSession)
    private readonly repository: Repository<AttendanceSession>,
  ) {}

  /**
   * Create a new attendance session
   */
  async create(sessionData: Partial<AttendanceSession>): Promise<AttendanceSession> {
    const session = this.repository.create(sessionData);
    return await this.repository.save(session);
  }

  /**
   * Update an existing session
   */
  async update(id: string, updateData: Partial<AttendanceSession>): Promise<AttendanceSession> {
    await this.repository.update(id, updateData);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Attendance session with id ${id} not found`);
    }
    return updated;
  }

  /**
   * Find session by ID
   */
  async findById(id: string): Promise<AttendanceSession | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['attendance'],
    });
  }

  /**
   * Find current active session for an attendance record
   */
  async findActiveByAttendanceId(attendanceId: string): Promise<AttendanceSession | null> {
    return await this.repository.findOne({
      where: {
        attendanceId,
        checkOutTime: IsNull(), // Active session has no check-out time
      },
      order: { checkInTime: 'DESC' },
    });
  }

  /**
   * Find all sessions for an attendance record
   */
  async findByAttendanceId(attendanceId: string): Promise<AttendanceSession[]> {
    return await this.repository.find({
      where: { attendanceId },
      order: { checkInTime: 'ASC' },
    });
  }

  /**
   * Find sessions by type for an attendance record
   */
  async findByAttendanceIdAndType(
    attendanceId: string,
    sessionType: string,
  ): Promise<AttendanceSession[]> {
    return await this.repository.find({
      where: {
        attendanceId,
        sessionType,
      },
      order: { checkInTime: 'ASC' },
    });
  }

  /**
   * Find sessions for multiple attendance records
   */
  async findByAttendanceIds(attendanceIds: string[]): Promise<AttendanceSession[]> {
    if (attendanceIds.length === 0) {
      return [];
    }

    return await this.repository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.attendance', 'attendance')
      .where('session.attendanceId IN (:...attendanceIds)', { attendanceIds })
      .orderBy('session.checkInTime', 'ASC')
      .getMany();
  }

  /**
   * Find flagged sessions
   */
  async findFlagged(limit: number = 50): Promise<AttendanceSession[]> {
    return await this.repository.find({
      where: { isFlagged: true },
      relations: ['attendance', 'attendance.user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get session statistics for an attendance record
   */
  async getSessionStats(attendanceId: string): Promise<{
    totalSessions: number;
    totalBreakTime: number;
    totalMeetingTime: number;
    totalLunchTime: number;
    flaggedSessions: number;
  }> {
    const result = await this.repository
      .createQueryBuilder('session')
      .select([
        'COUNT(*) as "totalSessions"',
        'COALESCE(SUM(CASE WHEN session.sessionType = \'break\' THEN session.sessionDurationMinutes END), 0) as "totalBreakTime"',
        'COALESCE(SUM(CASE WHEN session.sessionType = \'meeting\' THEN session.sessionDurationMinutes END), 0) as "totalMeetingTime"',
        'COALESCE(SUM(CASE WHEN session.sessionType = \'lunch\' THEN session.sessionDurationMinutes END), 0) as "totalLunchTime"',
        'COUNT(CASE WHEN session.isFlagged = true THEN 1 END) as "flaggedSessions"',
      ])
      .where('session.attendanceId = :attendanceId', { attendanceId })
      .andWhere('session.checkOutTime IS NOT NULL') // Only completed sessions
      .getRawOne();

    return {
      totalSessions: parseInt(result.totalSessions) || 0,
      totalBreakTime: parseInt(result.totalBreakTime) || 0,
      totalMeetingTime: parseInt(result.totalMeetingTime) || 0,
      totalLunchTime: parseInt(result.totalLunchTime) || 0,
      flaggedSessions: parseInt(result.flaggedSessions) || 0,
    };
  }

  /**
   * Find last completed session for travel speed analysis
   */
  async findLastCompletedSession(attendanceId: string): Promise<AttendanceSession | null> {
    return await this.repository
      .createQueryBuilder('session')
      .where('session.attendanceId = :attendanceId', { attendanceId })
      .andWhere('session.checkOutTime IS NOT NULL') // Completed session has check-out time
      .orderBy('session.checkOutTime', 'DESC')
      .getOne();
  }

  /**
   * Find sessions by user within date range
   */
  async findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AttendanceSession[]> {
    return await this.repository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.attendance', 'attendance')
      .where('attendance.userId = :userId', { userId })
      .andWhere('attendance.date >= :startDate', { startDate })
      .andWhere('attendance.date <= :endDate', { endDate })
      .orderBy('session.checkInTime', 'ASC')
      .getMany();
  }

  /**
   * Delete session
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { DailyAttendance } from '../entities/daily-attendance.entity';

/**
 * Daily Attendance Repository - Handles database operations for daily attendance
 * Provides CRUD operations and custom queries for attendance management
 */
@Injectable()
export class DailyAttendanceRepository {
  constructor(
    @InjectRepository(DailyAttendance)
    private readonly repository: Repository<DailyAttendance>,
  ) {}

  /**
   * Create a new daily attendance record
   */
  async create(attendanceData: Partial<DailyAttendance>): Promise<DailyAttendance> {
    const attendance = this.repository.create(attendanceData);
    return await this.repository.save(attendance);
  }

  /**
   * Update an existing attendance record
   */
  async update(id: string, updateData: Partial<DailyAttendance>): Promise<DailyAttendance> {
    await this.repository.update(id, updateData);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Daily attendance with id ${id} not found`);
    }
    return updated;
  }

  /**
   * Find attendance by ID with optional relations
   */
  async findById(id: string, relations: string[] = []): Promise<DailyAttendance | null> {
    return await this.repository.findOne({
      where: { id },
      relations,
    });
  }

  /**
   * Find today's attendance for a user
   */
  async findTodayByUserId(userId: string): Promise<DailyAttendance | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await this.repository.findOne({
      where: {
        userId,
        date: today,
      },
      relations: ['entity', 'attendanceSessions', 'locationLogs'],
    });
  }

  /**
   * Find attendance by user and specific date
   */
  async findByUserIdAndDate(userId: string, date: Date): Promise<DailyAttendance | null> {
    const searchDate = new Date(date);
    searchDate.setHours(0, 0, 0, 0);
    
    return await this.repository.findOne({
      where: {
        userId,
        date: searchDate,
      },
      relations: ['entity', 'attendanceSessions', 'locationLogs'],
    });
  }

  /**
   * Find attendance history for a user within date range
   */
  async findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DailyAttendance[]> {
    return await this.repository.find({
      where: {
        userId,
        date: Between(startDate, endDate),
      },
      relations: ['entity'],
      order: { date: 'DESC' },
    });
  }

  /**
   * Find all flagged attendance records
   */
  async findFlagged(limit: number = 50): Promise<DailyAttendance[]> {
    return await this.repository.find({
      where: { isFlagged: true },
      relations: ['user', 'entity'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find attendance records for multiple users (for manager reports)
   */
  async findByUserIds(
    userIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<DailyAttendance[]> {
    return await this.repository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.user', 'user')
      .leftJoinAndSelect('attendance.entity', 'entity')
      .where('attendance.userId IN (:...userIds)', { userIds })
      .andWhere('attendance.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('attendance.date', 'DESC')
      .addOrderBy('user.name', 'ASC')
      .getMany();
  }

  /**
   * Get attendance statistics for a date range
   */
  async getAttendanceStats(
    userIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    flaggedDays: number;
  }> {
    const result = await this.repository
      .createQueryBuilder('attendance')
      .select([
        'COUNT(*) as "totalDays"',
        'COUNT(CASE WHEN attendance.clockInTime IS NOT NULL THEN 1 END) as "presentDays"',
        'COUNT(CASE WHEN attendance.clockInTime IS NULL THEN 1 END) as "absentDays"',
        'COUNT(CASE WHEN attendance.status = \'Late\' THEN 1 END) as "lateDays"',
        'COUNT(CASE WHEN attendance.isFlagged = true THEN 1 END) as "flaggedDays"',
      ])
      .where('attendance.userId IN (:...userIds)', { userIds })
      .andWhere('attendance.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    return {
      totalDays: parseInt(result.totalDays) || 0,
      presentDays: parseInt(result.presentDays) || 0,
      absentDays: parseInt(result.absentDays) || 0,
      lateDays: parseInt(result.lateDays) || 0,
      flaggedDays: parseInt(result.flaggedDays) || 0,
    };
  }

  /**
   * Delete attendance record
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
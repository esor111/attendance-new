import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { LocationLog } from '../entities/location-log.entity';

/**
 * Location Log Repository - Handles database operations for field worker location logs
 * Manages client site visits and field work tracking
 */
@Injectable()
export class LocationLogRepository {
  constructor(
    @InjectRepository(LocationLog)
    private readonly repository: Repository<LocationLog>,
  ) {}

  /**
   * Create a new location log
   */
  async create(logData: Partial<LocationLog>): Promise<LocationLog> {
    const log = this.repository.create(logData);
    return await this.repository.save(log);
  }

  /**
   * Update an existing location log
   */
  async update(id: string, updateData: Partial<LocationLog>): Promise<LocationLog> {
    await this.repository.update(id, updateData);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Location log with id ${id} not found`);
    }
    return updated;
  }

  /**
   * Find location log by ID
   */
  async findById(id: string): Promise<LocationLog | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['attendance', 'entity'],
    });
  }

  /**
   * Find current active location log for an attendance record
   */
  async findActiveByAttendanceId(attendanceId: string): Promise<LocationLog | null> {
    return await this.repository.findOne({
      where: {
        attendanceId,
        checkOutTime: IsNull(), // Active log has no check-out time
      },
      relations: ['entity'],
      order: { checkInTime: 'DESC' },
    });
  }

  /**
   * Find all location logs for an attendance record
   */
  async findByAttendanceId(attendanceId: string): Promise<LocationLog[]> {
    return await this.repository.find({
      where: { attendanceId },
      relations: ['entity'],
      order: { checkInTime: 'ASC' },
    });
  }

  /**
   * Find location logs by user within date range
   */
  async findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LocationLog[]> {
    return await this.repository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.entity', 'entity')
      .leftJoinAndSelect('log.attendance', 'attendance')
      .where('attendance.userId = :userId', { userId })
      .andWhere('attendance.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('log.checkInTime', 'DESC')
      .getMany();
  }

  /**
   * Find flagged location logs
   */
  async findFlagged(limit: number = 50): Promise<LocationLog[]> {
    return await this.repository.find({
      where: { isFlagged: true },
      relations: ['attendance', 'attendance.user', 'entity'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get location visit statistics for a user
   */
  async getLocationStats(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalVisits: number;
    uniqueLocations: number;
    totalVisitTime: number;
    flaggedVisits: number;
    averageVisitDuration: number;
  }> {
    const result = await this.repository
      .createQueryBuilder('log')
      .leftJoin('log.attendance', 'attendance')
      .select([
        'COUNT(*) as "totalVisits"',
        'COUNT(DISTINCT log.entityId) as "uniqueLocations"',
        'COALESCE(SUM(log.visitDurationMinutes), 0) as "totalVisitTime"',
        'COUNT(CASE WHEN log.isFlagged = true THEN 1 END) as "flaggedVisits"',
        'COALESCE(AVG(log.visitDurationMinutes), 0) as "averageVisitDuration"',
      ])
      .where('attendance.userId = :userId', { userId })
      .andWhere('attendance.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('log.checkOutTime IS NOT NULL') // Only completed visits
      .getRawOne();

    return {
      totalVisits: parseInt(result.totalVisits) || 0,
      uniqueLocations: parseInt(result.uniqueLocations) || 0,
      totalVisitTime: parseInt(result.totalVisitTime) || 0,
      flaggedVisits: parseInt(result.flaggedVisits) || 0,
      averageVisitDuration: parseFloat(result.averageVisitDuration) || 0,
    };
  }

  /**
   * Find last completed location log for travel speed analysis
   */
  async findLastCompletedLog(attendanceId: string): Promise<LocationLog | null> {
    return await this.repository
      .createQueryBuilder('log')
      .where('log.attendanceId = :attendanceId', { attendanceId })
      .andWhere('log.checkOutTime IS NOT NULL') // Completed log has check-out time
      .orderBy('log.checkOutTime', 'DESC')
      .getOne();
  }

  /**
   * Find location logs by entity
   */
  async findByEntityId(
    entityId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LocationLog[]> {
    return await this.repository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.attendance', 'attendance')
      .leftJoinAndSelect('attendance.user', 'user')
      .where('log.entityId = :entityId', { entityId })
      .andWhere('attendance.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('log.checkInTime', 'DESC')
      .getMany();
  }

  /**
   * Delete location log
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
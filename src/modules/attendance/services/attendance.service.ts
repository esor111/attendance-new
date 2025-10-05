import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { GeospatialService } from './geospatial.service';
import { FraudDetectionService } from './fraud-detection.service';
import { TransactionManagerService } from './transaction-manager.service';
import { AttendanceValidationService } from './attendance-validation.service';
import { RemoteWorkService } from './remote-work.service';
import { DailyAttendanceRepository } from '../repositories/daily-attendance.repository';
import { AttendanceSessionRepository } from '../repositories/attendance-session.repository';
import { LocationLogRepository } from '../repositories/location-log.repository';
import { ReportingStructureRepository } from '../repositories/reporting-structure.repository';
import { DailyAttendance } from '../entities/daily-attendance.entity';
import { AttendanceSession } from '../entities/attendance-session.entity';
import { LocationLog } from '../entities/location-log.entity';
import { ClockInDto } from '../dto/clock-in.dto';
import { ClockOutDto } from '../dto/clock-out.dto';
import { SessionCheckInDto } from '../dto/session-check-in.dto';
import { SessionCheckOutDto } from '../dto/session-check-out.dto';
import { LocationCheckInDto } from '../dto/location-check-in.dto';
import { LocationCheckOutDto } from '../dto/location-check-out.dto';
import { AttendanceServiceInterface } from '../interfaces/attendance.interface';
import { ConcurrentOperationException } from '../../../common/exceptions/business-logic.exceptions';

/**
 * Attendance Service - Core business logic for attendance operations
 * Implements daily attendance, session management, and field worker location tracking
 * Integrates with geospatial validation, fraud detection, and transaction management
 */
@Injectable()
export class AttendanceService implements AttendanceServiceInterface {
  constructor(
    private readonly geospatialService: GeospatialService,
    private readonly fraudDetectionService: FraudDetectionService,
    private readonly transactionManager: TransactionManagerService,
    private readonly validationService: AttendanceValidationService,
    private readonly remoteWorkService: RemoteWorkService,
    private readonly attendanceRepository: DailyAttendanceRepository,
    private readonly sessionRepository: AttendanceSessionRepository,
    private readonly locationLogRepository: LocationLogRepository,
    private readonly reportingStructureRepository: ReportingStructureRepository,
  ) {}

  /**
   * Remote work clock-in - Start daily attendance for remote work
   */
  async remoteWorkClockIn(
    userId: string, 
    dto: { latitude: number; longitude: number; remoteLocation: string; notes?: string }
  ): Promise<DailyAttendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const result = await this.transactionManager.executeClockIn(
        userId,
        {
          id: undefined, // Will be generated
          date: today,
          clockInTime: new Date(),
          clockInLatitude: dto.latitude,
          clockInLongitude: dto.longitude,
          workLocation: 'REMOTE',
          remoteLocation: dto.remoteLocation,
          isRemoteApproved: true, // Will be validated
          notes: dto.notes,
          status: 'Present',
        },
        async (queryRunner) => {
          // Comprehensive validation within transaction
          const validation = await this.validationService.validateRemoteWorkClockIn(
            queryRunner,
            userId,
            dto.latitude,
            dto.longitude,
            today,
            dto.remoteLocation,
          );

          // Update clock-in data with validation results
          Object.assign(arguments[1], {
            isRemoteApproved: validation.isApproved,
            isFlagged: validation.fraudAnalysis.isSuspicious,
            flagReason: validation.fraudAnalysis.flagReason,
          });
        },
      );

      // Convert raw result to entity
      const attendance = await this.attendanceRepository.findById(result.id);
      if (!attendance) {
        throw new Error('Failed to retrieve created attendance record');
      }

      return attendance;
    } catch (error) {
      if (error.message?.includes('concurrent')) {
        throw new ConcurrentOperationException(userId, 'remote-clock-in');
      }
      throw error;
    }
  }

  /**
   * Remote work clock-out - End daily attendance for remote work
   */
  async remoteWorkClockOut(userId: string, dto: ClockOutDto): Promise<DailyAttendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const result = await this.transactionManager.executeClockOut(
        userId,
        {
          date: today,
          clockOutTime: new Date(),
          clockOutLatitude: dto.latitude,
          clockOutLongitude: dto.longitude,
          notes: dto.notes,
        },
        async (queryRunner, attendance) => {
          // Comprehensive validation within transaction
          const validation = await this.validationService.validateRemoteWorkClockOut(
            queryRunner,
            attendance,
            userId,
            dto.latitude,
            dto.longitude,
          );

          // Update clock-out data with validation results
          Object.assign(arguments[1], {
            totalHours: validation.totalHours,
            travelSpeedKmph: validation.fraudAnalysis.travelSpeedKmph,
            isFlagged: attendance.is_flagged || validation.fraudAnalysis.isSuspicious,
            flagReason: validation.fraudAnalysis.isSuspicious 
              ? (attendance.flag_reason ? `${attendance.flag_reason}; ${validation.fraudAnalysis.flagReason}` : validation.fraudAnalysis.flagReason)
              : attendance.flag_reason,
          });
        },
      );

      // Convert raw result to entity
      const attendance = await this.attendanceRepository.findById(result.id);
      if (!attendance) {
        throw new Error('Failed to retrieve updated attendance record');
      }

      return attendance;
    } catch (error) {
      if (error.message?.includes('concurrent')) {
        throw new ConcurrentOperationException(userId, 'remote-clock-out');
      }
      throw error;
    }
  }

  /**
   * Clock-in - Start daily attendance with location validation and transaction management
   * Supports office, remote, and field work locations
   */
  async clockIn(userId: string, dto: ClockInDto): Promise<DailyAttendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Determine work location - default to OFFICE if not specified
    const workLocation = dto.workLocation || 'OFFICE';

    // For remote work, delegate to remote work method
    if (workLocation === 'REMOTE') {
      if (!dto.remoteLocation) {
        throw new BadRequestException('Remote location is required for remote work');
      }
      return await this.remoteWorkClockIn(userId, {
        ...dto,
        remoteLocation: dto.remoteLocation,
      });
    }

    try {
      const result = await this.transactionManager.executeClockIn(
        userId,
        {
          id: undefined, // Will be generated
          date: today,
          clockInTime: new Date(),
          clockInLatitude: dto.latitude,
          clockInLongitude: dto.longitude,
          workLocation,
          remoteLocation: dto.remoteLocation,
          notes: dto.notes,
          status: 'Present',
        },
        async (queryRunner) => {
          // Comprehensive validation within transaction
          const validation = await this.validationService.validateClockIn(
            queryRunner,
            userId,
            dto.latitude,
            dto.longitude,
            today,
          );

          // Update clock-in data with validation results
          Object.assign(arguments[1], {
            entityId: validation.entityId,
            isWithinRadius: validation.isWithinRadius,
            isFlagged: validation.fraudAnalysis.isSuspicious,
            flagReason: validation.fraudAnalysis.flagReason,
          });
        },
      );

      // Convert raw result to entity
      const attendance = await this.attendanceRepository.findById(result.id);
      if (!attendance) {
        throw new Error('Failed to retrieve created attendance record');
      }

      return attendance;
    } catch (error) {
      if (error.message?.includes('concurrent')) {
        throw new ConcurrentOperationException(userId, 'clock-in');
      }
      throw error;
    }
  }

  /**
   * Clock-out - End daily attendance with travel analysis and transaction management
   */
  async clockOut(userId: string, dto: ClockOutDto): Promise<DailyAttendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const result = await this.transactionManager.executeClockOut(
        userId,
        {
          date: today,
          clockOutTime: new Date(),
          clockOutLatitude: dto.latitude,
          clockOutLongitude: dto.longitude,
          notes: dto.notes,
        },
        async (queryRunner, attendance) => {
          // Comprehensive validation within transaction
          const validation = await this.validationService.validateClockOut(
            queryRunner,
            attendance,
            userId,
            dto.latitude,
            dto.longitude,
          );

          // Update clock-out data with validation results
          Object.assign(arguments[1], {
            totalHours: validation.totalHours,
            travelSpeedKmph: validation.fraudAnalysis.travelSpeedKmph,
            isFlagged: attendance.is_flagged || validation.fraudAnalysis.isSuspicious,
            flagReason: validation.fraudAnalysis.isSuspicious 
              ? (attendance.flag_reason ? `${attendance.flag_reason}; ${validation.fraudAnalysis.flagReason}` : validation.fraudAnalysis.flagReason)
              : attendance.flag_reason,
          });
        },
      );

      // Convert raw result to entity
      const attendance = await this.attendanceRepository.findById(result.id);
      if (!attendance) {
        throw new Error('Failed to retrieve updated attendance record');
      }

      return attendance;
    } catch (error) {
      if (error.message?.includes('concurrent')) {
        throw new ConcurrentOperationException(userId, 'clock-out');
      }
      throw error;
    }
  }

  /**
   * Session check-in - Start break, meeting, or other session with transaction management
   */
  async sessionCheckIn(userId: string, dto: SessionCheckInDto): Promise<AttendanceSession> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const result = await this.transactionManager.executeSessionCheckIn(
        userId,
        {
          id: undefined, // Will be generated
          date: today,
          checkInTime: new Date(),
          checkInLatitude: dto.latitude,
          checkInLongitude: dto.longitude,
          sessionType: dto.sessionType || 'work',
          notes: dto.notes,
        },
        async (queryRunner, attendance) => {
          // Comprehensive validation within transaction
          const validation = await this.validationService.validateSessionCheckIn(
            queryRunner,
            attendance,
            userId,
            dto.latitude,
            dto.longitude,
            dto.sessionType || 'work',
          );

          // Update session data with validation results
          Object.assign(arguments[1], {
            isWithinRadius: validation.isWithinRadius,
          });
        },
      );

      // Convert raw result to entity
      const session = await this.sessionRepository.findById(result.id);
      if (!session) {
        throw new Error('Failed to retrieve created session record');
      }

      return session;
    } catch (error) {
      if (error.message?.includes('concurrent')) {
        throw new ConcurrentOperationException(userId, 'session-check-in');
      }
      throw error;
    }
  }

  /**
   * Session check-out - End current session
   */
  async sessionCheckOut(userId: string, dto: SessionCheckOutDto): Promise<AttendanceSession> {
    const attendance = await this.attendanceRepository.findTodayByUserId(userId);
    if (!attendance) {
      throw new NotFoundException('No attendance record found for today');
    }

    const activeSession = await this.sessionRepository.findActiveByAttendanceId(attendance.id);
    if (!activeSession) {
      throw new BadRequestException('No active session to check out from');
    }

    // Analyze travel from session check-in location
    const fraudAnalysis = await this.fraudDetectionService.analyzeSessionTravel(
      activeSession.id,
      dto.latitude,
      dto.longitude,
    );

    // Calculate session duration
    const checkOutTime = new Date();
    const durationMinutes = Math.round(
      (checkOutTime.getTime() - activeSession.checkInTime.getTime()) / (1000 * 60)
    );

    const updateData: Partial<AttendanceSession> = {
      checkOutTime,
      checkOutLatitude: dto.latitude,
      checkOutLongitude: dto.longitude,
      sessionDurationMinutes: durationMinutes,
      travelSpeedKmph: fraudAnalysis.travelSpeedKmph,
      isFlagged: fraudAnalysis.isSuspicious,
      flagReason: fraudAnalysis.flagReason,
      notes: dto.notes ? (activeSession.notes ? `${activeSession.notes}; ${dto.notes}` : dto.notes) : activeSession.notes,
    };

    const updatedSession = await this.sessionRepository.update(activeSession.id, updateData);

    // Flag if suspicious
    if (fraudAnalysis.isSuspicious && fraudAnalysis.flagReason) {
      await this.fraudDetectionService.flagSuspiciousActivity(
        activeSession.id,
        'session',
        fraudAnalysis.flagReason,
      );
    }

    return updatedSession;
  }

  /**
   * Location check-in - Field worker client site visit
   */
  async locationCheckIn(userId: string, dto: LocationCheckInDto): Promise<LocationLog> {
    // Require active daily attendance
    const attendance = await this.attendanceRepository.findTodayByUserId(userId);
    if (!attendance || !attendance.clockInTime) {
      throw new BadRequestException('Must clock-in for daily attendance before location check-in');
    }

    // Check for existing active location log
    const activeLog = await this.locationLogRepository.findActiveByAttendanceId(attendance.id);
    if (activeLog) {
      throw new ConflictException('Already have an active location check-in. Please check out first.');
    }

    // Validate entity access
    const hasAccess = await this.geospatialService.hasEntityAccess(userId, dto.entityId);
    if (!hasAccess) {
      throw new BadRequestException('No access to the specified entity');
    }

    // Get entity details
    const entity = await this.geospatialService.getEntityById(dto.entityId);
    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    // Validate location within entity radius
    const entityLat = entity.location.coordinates[1];
    const entityLng = entity.location.coordinates[0];
    const isWithinRadius = this.geospatialService.isWithinRadius(
      entityLat,
      entityLng,
      dto.latitude,
      dto.longitude,
      entity.radiusMeters,
    );

    if (!isWithinRadius) {
      const distance = this.geospatialService.calculateDistance(
        entityLat,
        entityLng,
        dto.latitude,
        dto.longitude,
      );
      throw new BadRequestException(
        `Location is ${Math.round(distance)}m from entity "${entity.name}" (radius: ${entity.radiusMeters}m)`
      );
    }

    const logData: Partial<LocationLog> = {
      attendanceId: attendance.id,
      entityId: dto.entityId,
      placeName: entity.name,
      checkInTime: new Date(),
      checkInLatitude: dto.latitude,
      checkInLongitude: dto.longitude,
      isWithinRadius,
      purpose: dto.purpose,
      notes: dto.notes,
    };

    return await this.locationLogRepository.create(logData);
  }

  /**
   * Location check-out - End client site visit
   */
  async locationCheckOut(userId: string, dto: LocationCheckOutDto): Promise<LocationLog> {
    const attendance = await this.attendanceRepository.findTodayByUserId(userId);
    if (!attendance) {
      throw new NotFoundException('No attendance record found for today');
    }

    const activeLog = await this.locationLogRepository.findActiveByAttendanceId(attendance.id);
    if (!activeLog) {
      throw new BadRequestException('No active location check-in to check out from');
    }

    // Analyze travel (if there was a previous location log)
    const previousLog = await this.locationLogRepository.findLastCompletedLog(attendance.id);
    let fraudAnalysis: { isSuspicious: boolean; travelSpeedKmph?: number; flagReason?: string } = { 
      isSuspicious: false, 
      travelSpeedKmph: 0, 
      flagReason: undefined 
    };
    
    if (previousLog) {
      fraudAnalysis = await this.fraudDetectionService.analyzeLocationLogTravel(
        previousLog.id,
        dto.latitude,
        dto.longitude,
      );
    }

    // Calculate visit duration
    const checkOutTime = new Date();
    const durationMinutes = Math.round(
      (checkOutTime.getTime() - (activeLog.checkInTime?.getTime() || checkOutTime.getTime())) / (1000 * 60)
    );

    const updateData: Partial<LocationLog> = {
      checkOutTime,
      checkOutLatitude: dto.latitude,
      checkOutLongitude: dto.longitude,
      visitDurationMinutes: durationMinutes,
      travelSpeedKmph: fraudAnalysis.travelSpeedKmph,
      isFlagged: fraudAnalysis.isSuspicious,
      flagReason: fraudAnalysis.flagReason,
      notes: dto.notes ? (activeLog.notes ? `${activeLog.notes}; ${dto.notes}` : dto.notes) : activeLog.notes,
    };

    const updatedLog = await this.locationLogRepository.update(activeLog.id, updateData);

    // Flag if suspicious
    if (fraudAnalysis.isSuspicious && fraudAnalysis.flagReason) {
      await this.fraudDetectionService.flagSuspiciousActivity(
        activeLog.id,
        'location_log',
        fraudAnalysis.flagReason,
      );
    }

    return updatedLog;
  }

  /**
   * Get today's attendance record
   */
  async getTodayAttendance(userId: string): Promise<DailyAttendance | null> {
    return await this.attendanceRepository.findTodayByUserId(userId);
  }

  /**
   * Get attendance by specific date
   */
  async getAttendanceByDate(userId: string, date: Date): Promise<DailyAttendance | null> {
    return await this.attendanceRepository.findByUserIdAndDate(userId, date);
  }

  /**
   * Get user attendance history
   */
  async getUserAttendanceHistory(userId: string, startDate: Date, endDate: Date): Promise<DailyAttendance[]> {
    return await this.attendanceRepository.findByUserIdAndDateRange(userId, startDate, endDate);
  }

  /**
   * Get current active session
   */
  async getCurrentSession(userId: string): Promise<AttendanceSession | null> {
    const attendance = await this.attendanceRepository.findTodayByUserId(userId);
    if (!attendance) return null;

    return await this.sessionRepository.findActiveByAttendanceId(attendance.id);
  }

  /**
   * Get current active location log
   */
  async getCurrentLocationLog(userId: string): Promise<LocationLog | null> {
    const attendance = await this.attendanceRepository.findTodayByUserId(userId);
    if (!attendance) return null;

    return await this.locationLogRepository.findActiveByAttendanceId(attendance.id);
  }

  /**
   * Get team attendance for managers
   */
  async getTeamAttendance(managerId: string, startDate: Date, endDate: Date): Promise<any> {
    const teamMemberIds = await this.reportingStructureRepository.getTeamMemberIds(managerId);
    
    if (teamMemberIds.length === 0) {
      return {
        teamMembers: [],
        statistics: {
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          flaggedDays: 0,
        },
      };
    }

    const attendanceRecords = await this.attendanceRepository.findByUserIds(teamMemberIds, startDate, endDate);
    const statistics = await this.attendanceRepository.getAttendanceStats(teamMemberIds, startDate, endDate);

    return {
      teamMembers: attendanceRecords,
      statistics,
    };
  }

  /**
   * Get individual team member attendance
   */
  async getTeamMemberAttendance(
    managerId: string,
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DailyAttendance[]> {
    // Verify manager has access to this employee
    const hasAccess = await this.reportingStructureRepository.existsRelationship(employeeId, managerId);
    if (!hasAccess) {
      throw new BadRequestException('No access to this employee\'s attendance data');
    }

    return await this.attendanceRepository.findByUserIdAndDateRange(employeeId, startDate, endDate);
  }

  /**
   * Get location visit history for a user
   */
  async getLocationHistory(userId: string, startDate: Date, endDate: Date): Promise<LocationLog[]> {
    return await this.locationLogRepository.findByUserIdAndDateRange(userId, startDate, endDate);
  }

  /**
   * Get flagged records for review
   */
  async getFlaggedRecords(limit: number = 50): Promise<any> {
    const flaggedAttendance = await this.attendanceRepository.findFlagged(limit);
    const flaggedSessions = await this.sessionRepository.findFlagged(limit);
    const flaggedLogs = await this.locationLogRepository.findFlagged(limit);

    return {
      attendance: flaggedAttendance,
      sessions: flaggedSessions,
      locationLogs: flaggedLogs,
    };
  }

  /**
   * Get attendance analytics and patterns for a user
   */
  async getAttendanceAnalytics(userId: string, startDate: Date, endDate: Date): Promise<any> {
    // Get attendance records for the date range
    const attendanceRecords = await this.attendanceRepository.findByUserIdAndDateRange(userId, startDate, endDate);
    const sessions = await this.sessionRepository.findByUserIdAndDateRange(userId, startDate, endDate);
    const locationLogs = await this.locationLogRepository.findByUserIdAndDateRange(userId, startDate, endDate);

    // Calculate basic statistics
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(record => record.clockInTime).length;
    const absentDays = totalDays - presentDays;
    const lateDays = attendanceRecords.filter(record => {
      if (!record.clockInTime) return false;
      const clockInHour = record.clockInTime.getHours();
      const clockInMinute = record.clockInTime.getMinutes();
      return clockInHour > 9 || (clockInHour === 9 && clockInMinute > 15); // Late if after 9:15 AM
    }).length;
    const flaggedDays = attendanceRecords.filter(record => record.isFlagged).length;

    // Calculate total and average hours
    const totalHours = attendanceRecords
      .filter(record => record.totalHours)
      .reduce((sum, record) => sum + (record.totalHours || 0), 0);
    const averageHours = presentDays > 0 ? totalHours / presentDays : 0;

    // Calculate average clock-in and clock-out times
    const clockInTimes = attendanceRecords
      .filter(record => record.clockInTime)
      .map(record => record.clockInTime!);
    const clockOutTimes = attendanceRecords
      .filter(record => record.clockOutTime)
      .map(record => record.clockOutTime!);

    const averageClockInTime = this.calculateAverageTime(clockInTimes);
    const averageClockOutTime = this.calculateAverageTime(clockOutTimes);

    // Find most common entity
    const entityCounts = attendanceRecords.reduce((counts, record) => {
      if (record.entityId) {
        counts[record.entityId] = (counts[record.entityId] || 0) + 1;
      }
      return counts;
    }, {} as Record<string, number>);
    const mostCommonEntityId = Object.keys(entityCounts).reduce((a, b) => 
      entityCounts[a] > entityCounts[b] ? a : b, Object.keys(entityCounts)[0]);

    // Session breakdown
    const sessionBreakdown = sessions.reduce((breakdown, session) => {
      const type = session.sessionType || 'work';
      breakdown[type] = (breakdown[type] || 0) + 1;
      return breakdown;
    }, {} as Record<string, number>);

    // Calculate weekly hours trend (last 4 weeks)
    const weeklyHours = this.calculateWeeklyHours(attendanceRecords, endDate);

    // Calculate punctuality trend
    const punctualityTrend = this.calculatePunctualityTrend(attendanceRecords);

    // Calculate location consistency
    const locationConsistency = this.calculateLocationConsistency(attendanceRecords);

    return {
      summary: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        averageHours: Math.round(averageHours * 10) / 10,
        totalHours: Math.round(totalHours * 10) / 10,
        flaggedDays,
      },
      patterns: {
        averageClockInTime,
        averageClockOutTime,
        mostCommonEntity: mostCommonEntityId || 'Unknown',
        sessionBreakdown,
      },
      trends: {
        weeklyHours,
        punctualityTrend,
        locationConsistency: Math.round(locationConsistency * 10) / 10,
      },
    };
  }

  /**
   * Calculate average time from array of dates
   */
  private calculateAverageTime(times: Date[]): string {
    if (times.length === 0) return '00:00:00';

    const totalMinutes = times.reduce((sum, time) => {
      return sum + time.getHours() * 60 + time.getMinutes();
    }, 0);

    const averageMinutes = totalMinutes / times.length;
    const hours = Math.floor(averageMinutes / 60);
    const minutes = Math.floor(averageMinutes % 60);
    const seconds = Math.floor((averageMinutes % 1) * 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate weekly hours for the last 4 weeks
   */
  private calculateWeeklyHours(records: DailyAttendance[], endDate: Date): number[] {
    const weeks: number[] = [];
    const currentDate = new Date(endDate);

    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(currentDate);
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * i));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekRecords = records.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= weekStart && recordDate <= weekEnd;
      });

      const weekHours = weekRecords.reduce((sum, record) => sum + (record.totalHours || 0), 0);
      weeks.unshift(Math.round(weekHours * 10) / 10);
    }

    return weeks;
  }

  /**
   * Calculate punctuality trend
   */
  private calculatePunctualityTrend(records: DailyAttendance[]): string {
    if (records.length < 7) return 'insufficient_data';

    const recentRecords = records.slice(-7); // Last 7 days
    const olderRecords = records.slice(-14, -7); // Previous 7 days

    const recentLateCount = recentRecords.filter(record => {
      if (!record.clockInTime) return false;
      const clockInHour = record.clockInTime.getHours();
      const clockInMinute = record.clockInTime.getMinutes();
      return clockInHour > 9 || (clockInHour === 9 && clockInMinute > 15);
    }).length;

    const olderLateCount = olderRecords.filter(record => {
      if (!record.clockInTime) return false;
      const clockInHour = record.clockInTime.getHours();
      const clockInMinute = record.clockInTime.getMinutes();
      return clockInHour > 9 || (clockInHour === 9 && clockInMinute > 15);
    }).length;

    if (recentLateCount < olderLateCount) return 'improving';
    if (recentLateCount > olderLateCount) return 'declining';
    return 'stable';
  }

  /**
   * Calculate location consistency percentage
   */
  private calculateLocationConsistency(records: DailyAttendance[]): number {
    if (records.length === 0) return 0;

    const entityCounts = records.reduce((counts, record) => {
      if (record.entityId) {
        counts[record.entityId] = (counts[record.entityId] || 0) + 1;
      }
      return counts;
    }, {} as Record<string, number>);

    const mostCommonCount = Math.max(...Object.values(entityCounts));
    return (mostCommonCount / records.length) * 100;
  }
}
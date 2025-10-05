import { Injectable, Logger } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import {
  AttendanceStateException,
  FraudDetectionException,
  ReferentialIntegrityException,
  GeospatialValidationException,
} from '../../../common/exceptions/business-logic.exceptions';
import { FraudDetectionService } from './fraud-detection.service';
import { GeospatialService } from './geospatial.service';
import { RemoteWorkService } from './remote-work.service';

/**
 * Attendance Validation Service - Comprehensive validation for attendance operations
 * Handles business rule validation, fraud detection, and data integrity checks
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 9.1, 9.2, 9.6, 9.7
 */
@Injectable()
export class AttendanceValidationService {
  private readonly logger = new Logger(AttendanceValidationService.name);

  constructor(
    private readonly fraudDetectionService: FraudDetectionService,
    private readonly geospatialService: GeospatialService,
    private readonly remoteWorkService: RemoteWorkService,
  ) {}

  /**
   * Validate clock-in operation
   */
  async validateClockIn(
    queryRunner: QueryRunner,
    userId: string,
    latitude: number,
    longitude: number,
    date: Date,
  ): Promise<{
    entityId: string;
    isWithinRadius: boolean;
    fraudAnalysis: any;
  }> {
    // Check for existing attendance
    const existingAttendance = await queryRunner.manager
      .createQueryBuilder()
      .select('attendance')
      .from('daily_attendance', 'attendance')
      .where('attendance.user_id = :userId', { userId })
      .andWhere('attendance.date = :date', { date })
      .getOne();

    if (existingAttendance && existingAttendance.clock_in_time) {
      throw new AttendanceStateException('already_clocked_in', 'clock-in', userId);
    }

    // Validate coordinates
    this.validateCoordinates(latitude, longitude);

    // Validate location access
    const locationValidation = await this.geospatialService.validateLocationAccess(
      userId,
      latitude,
      longitude,
    );

    if (!locationValidation.isValid || !locationValidation.entity) {
      throw new GeospatialValidationException(
        locationValidation.errorMessage || 'Location validation failed',
        { latitude, longitude },
      );
    }

    // Analyze for fraud
    const fraudAnalysis = await this.fraudDetectionService.analyzeClockInLocation(
      userId,
      latitude,
      longitude,
    );

    // Check for suspicious patterns
    const patternAnalysis = await this.fraudDetectionService.analyzeUserPatterns(userId);
    if (patternAnalysis.hasPattern && patternAnalysis.riskLevel === 'high') {
      throw new FraudDetectionException('suspicious_location_pattern', {
        threshold: 3,
      });
    }

    // Validate referential integrity
    await this.validateUserEntityIntegrity(queryRunner, userId, locationValidation.entity.entityId);

    return {
      entityId: locationValidation.entity.entityId,
      isWithinRadius: locationValidation.entity.isWithinRadius,
      fraudAnalysis,
    };
  }

  /**
   * Validate clock-out operation
   */
  async validateClockOut(
    queryRunner: QueryRunner,
    attendance: any,
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<{
    fraudAnalysis: any;
    totalHours: number;
  }> {
    if (!attendance.clock_in_time) {
      throw new AttendanceStateException('not_clocked_in', 'clock-out', userId);
    }

    if (attendance.clock_out_time) {
      throw new AttendanceStateException('already_clocked_out', 'clock-out', userId);
    }

    // Check for active sessions
    const activeSession = await queryRunner.manager
      .createQueryBuilder()
      .select('session')
      .from('attendance_sessions', 'session')
      .where('session.attendance_id = :attendanceId', { attendanceId: attendance.id })
      .andWhere('session.check_out_time IS NULL')
      .getOne();

    if (activeSession) {
      throw new AttendanceStateException('active_session', 'clock-out', userId);
    }

    // Validate coordinates
    this.validateCoordinates(latitude, longitude);

    // Analyze travel from clock-in location
    const fraudAnalysis = await this.fraudDetectionService.analyzeClockOutTravel(
      attendance.id,
      latitude,
      longitude,
    );

    // Check for impossible travel speed
    if (fraudAnalysis.isSuspicious && fraudAnalysis.travelSpeedKmph && fraudAnalysis.travelSpeedKmph > 200) {
      throw new FraudDetectionException('impossible_travel_speed', {
        travelSpeed: fraudAnalysis.travelSpeedKmph,
        threshold: 200,
      });
    }

    // Calculate total hours
    const clockOutTime = new Date();
    const totalHours = (clockOutTime.getTime() - new Date(attendance.clock_in_time).getTime()) / (1000 * 60 * 60);

    // Validate reasonable work hours (0.5 to 16 hours)
    if (totalHours < 0.5) {
      throw new AttendanceStateException('insufficient_work_time', 'clock-out', userId);
    }

    if (totalHours > 16) {
      this.logger.warn(`Unusually long work day detected for user ${userId}: ${totalHours} hours`);
    }

    return {
      fraudAnalysis,
      totalHours: Math.round(totalHours * 100) / 100,
    };
  }

  /**
   * Validate session check-in operation
   */
  async validateSessionCheckIn(
    queryRunner: QueryRunner,
    attendance: any,
    userId: string,
    latitude: number,
    longitude: number,
    sessionType: string,
  ): Promise<{
    isWithinRadius: boolean;
  }> {
    if (!attendance || !attendance.clock_in_time) {
      throw new AttendanceStateException('no_daily_attendance', 'session-check-in', userId);
    }

    // Check for existing active session
    const activeSession = await queryRunner.manager
      .createQueryBuilder()
      .select('session')
      .from('attendance_sessions', 'session')
      .where('session.attendance_id = :attendanceId', { attendanceId: attendance.id })
      .andWhere('session.check_out_time IS NULL')
      .getOne();

    if (activeSession) {
      throw new AttendanceStateException('active_session_exists', 'session-check-in', userId);
    }

    // Validate coordinates
    this.validateCoordinates(latitude, longitude);

    // Validate location access
    const locationValidation = await this.geospatialService.validateLocationAccess(
      userId,
      latitude,
      longitude,
    );

    if (!locationValidation.isValid || !locationValidation.entity) {
      throw new GeospatialValidationException(
        locationValidation.errorMessage || 'Location validation failed for session',
        { latitude, longitude },
      );
    }

    // Validate session type
    const validSessionTypes = ['work', 'break', 'lunch', 'meeting', 'errand'];
    if (!validSessionTypes.includes(sessionType)) {
      throw new Error(`Invalid session type: ${sessionType}. Must be one of: ${validSessionTypes.join(', ')}`);
    }

    return {
      isWithinRadius: locationValidation.entity.isWithinRadius,
    };
  }

  /**
   * Validate session check-out operation
   */
  async validateSessionCheckOut(
    queryRunner: QueryRunner,
    activeSession: any,
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<{
    fraudAnalysis: any;
    durationMinutes: number;
  }> {
    if (!activeSession) {
      throw new AttendanceStateException('no_active_session', 'session-check-out', userId);
    }

    // Validate coordinates
    this.validateCoordinates(latitude, longitude);

    // Analyze travel from session check-in location
    const fraudAnalysis = await this.fraudDetectionService.analyzeSessionTravel(
      activeSession.id,
      latitude,
      longitude,
    );

    // Calculate session duration
    const checkOutTime = new Date();
    const durationMinutes = Math.round(
      (checkOutTime.getTime() - new Date(activeSession.check_in_time).getTime()) / (1000 * 60)
    );

    // Validate reasonable session duration (1 minute to 8 hours)
    if (durationMinutes < 1) {
      throw new Error('Session duration too short (minimum 1 minute)');
    }

    if (durationMinutes > 480) { // 8 hours
      this.logger.warn(`Unusually long session detected for user ${userId}: ${durationMinutes} minutes`);
    }

    return {
      fraudAnalysis,
      durationMinutes,
    };
  }

  /**
   * Validate location check-in operation
   */
  async validateLocationCheckIn(
    queryRunner: QueryRunner,
    attendance: any,
    userId: string,
    entityId: string,
    latitude: number,
    longitude: number,
  ): Promise<{
    entity: any;
    isWithinRadius: boolean;
  }> {
    if (!attendance || !attendance.clock_in_time) {
      throw new AttendanceStateException('no_daily_attendance', 'location-check-in', userId);
    }

    // Check for existing active location log
    const activeLog = await queryRunner.manager
      .createQueryBuilder()
      .select('log')
      .from('location_logs', 'log')
      .where('log.attendance_id = :attendanceId', { attendanceId: attendance.id })
      .andWhere('log.check_out_time IS NULL')
      .getOne();

    if (activeLog) {
      throw new AttendanceStateException('active_location_exists', 'location-check-in', userId);
    }

    // Validate coordinates
    this.validateCoordinates(latitude, longitude);

    // Validate entity access
    const hasAccess = await this.geospatialService.hasEntityAccess(userId, entityId);
    if (!hasAccess) {
      throw new ReferentialIntegrityException('user', userId, 'entity', entityId);
    }

    // Get entity details
    const entity = await this.geospatialService.getEntityById(entityId);
    if (!entity) {
      throw new ReferentialIntegrityException('location_log', 'new', 'entity', entityId);
    }

    // Validate location within entity radius
    const entityLat = entity.location.coordinates[1];
    const entityLng = entity.location.coordinates[0];
    const isWithinRadius = this.geospatialService.isWithinRadius(
      entityLat,
      entityLng,
      latitude,
      longitude,
      entity.radiusMeters,
    );

    if (!isWithinRadius) {
      const distance = this.geospatialService.calculateDistance(
        entityLat,
        entityLng,
        latitude,
        longitude,
      );
      throw new GeospatialValidationException(
        `Location is ${Math.round(distance)}m from entity "${entity.name}" (radius: ${entity.radiusMeters}m)`,
        { latitude, longitude },
      );
    }

    return {
      entity,
      isWithinRadius,
    };
  }

  /**
   * Validate location check-out operation
   */
  async validateLocationCheckOut(
    queryRunner: QueryRunner,
    activeLog: any,
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<{
    fraudAnalysis: any;
    durationMinutes: number;
  }> {
    if (!activeLog) {
      throw new AttendanceStateException('no_active_location', 'location-check-out', userId);
    }

    // Validate coordinates
    this.validateCoordinates(latitude, longitude);

    // Get previous completed log for travel analysis
    const previousLog = await queryRunner.manager
      .createQueryBuilder()
      .select('log')
      .from('location_logs', 'log')
      .where('log.attendance_id = :attendanceId', { attendanceId: activeLog.attendance_id })
      .andWhere('log.check_out_time IS NOT NULL')
      .andWhere('log.id != :currentId', { currentId: activeLog.id })
      .orderBy('log.check_out_time', 'DESC')
      .getOne();

    let fraudAnalysis: { isSuspicious: boolean; travelSpeedKmph?: number; flagReason?: string } = { 
      isSuspicious: false, 
      travelSpeedKmph: 0, 
      flagReason: undefined 
    };
    
    if (previousLog) {
      const result = await this.fraudDetectionService.analyzeLocationLogTravel(
        previousLog.id,
        latitude,
        longitude,
      );
      fraudAnalysis = {
        isSuspicious: result.isSuspicious,
        travelSpeedKmph: result.travelSpeedKmph || 0,
        flagReason: result.flagReason,
      };
    }

    // Calculate visit duration
    const checkOutTime = new Date();
    const durationMinutes = Math.round(
      (checkOutTime.getTime() - new Date(activeLog.check_in_time).getTime()) / (1000 * 60)
    );

    // Validate reasonable visit duration (1 minute to 12 hours)
    if (durationMinutes < 1) {
      throw new Error('Visit duration too short (minimum 1 minute)');
    }

    if (durationMinutes > 720) { // 12 hours
      this.logger.warn(`Unusually long location visit detected for user ${userId}: ${durationMinutes} minutes`);
    }

    return {
      fraudAnalysis,
      durationMinutes,
    };
  }

  /**
   * Validate coordinates are within valid ranges
   */
  private validateCoordinates(latitude: number, longitude: number): void {
    if (latitude < -90 || latitude > 90) {
      throw new GeospatialValidationException(
        `Invalid latitude: ${latitude}. Must be between -90 and 90 degrees`,
        { latitude, longitude },
      );
    }

    if (longitude < -180 || longitude > 180) {
      throw new GeospatialValidationException(
        `Invalid longitude: ${longitude}. Must be between -180 and 180 degrees`,
        { latitude, longitude },
      );
    }

    // Check for obviously invalid coordinates (0,0 is suspicious unless actually at that location)
    if (latitude === 0 && longitude === 0) {
      this.logger.warn('Coordinates (0,0) detected - may indicate GPS failure');
    }
  }

  /**
   * Validate remote work clock-in operation
   */
  async validateRemoteWorkClockIn(
    queryRunner: QueryRunner,
    userId: string,
    latitude: number,
    longitude: number,
    date: Date,
    remoteLocation: string,
  ): Promise<{
    isApproved: boolean;
    fraudAnalysis: any;
  }> {
    // Check for existing attendance
    const existingAttendance = await queryRunner.manager
      .createQueryBuilder()
      .select('attendance')
      .from('daily_attendance', 'attendance')
      .where('attendance.user_id = :userId', { userId })
      .andWhere('attendance.date = :date', { date })
      .getOne();

    if (existingAttendance && existingAttendance.clock_in_time) {
      throw new AttendanceStateException('already_clocked_in', 'remote-clock-in', userId);
    }

    // Validate coordinates
    this.validateCoordinates(latitude, longitude);

    // Check if user has approved remote work for this date
    const hasApprovedRemoteWork = await this.remoteWorkService.hasApprovedRemoteWork(userId, date);
    if (!hasApprovedRemoteWork) {
      throw new AttendanceStateException('no_remote_work_approval', 'remote-clock-in', userId);
    }

    // Analyze for fraud (different patterns for remote work)
    const fraudAnalysis = await this.fraudDetectionService.analyzeRemoteWorkClockIn(
      userId,
      latitude,
      longitude,
      remoteLocation,
    );

    return {
      isApproved: hasApprovedRemoteWork,
      fraudAnalysis,
    };
  }

  /**
   * Validate remote work clock-out operation
   */
  async validateRemoteWorkClockOut(
    queryRunner: QueryRunner,
    attendance: any,
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<{
    fraudAnalysis: any;
    totalHours: number;
  }> {
    if (!attendance.clock_in_time) {
      throw new AttendanceStateException('not_clocked_in', 'remote-clock-out', userId);
    }

    if (attendance.clock_out_time) {
      throw new AttendanceStateException('already_clocked_out', 'remote-clock-out', userId);
    }

    if (attendance.work_location !== 'REMOTE') {
      throw new AttendanceStateException('not_remote_work', 'remote-clock-out', userId);
    }

    // Validate coordinates
    this.validateCoordinates(latitude, longitude);

    // Analyze remote work patterns for fraud
    const fraudAnalysis = await this.fraudDetectionService.analyzeRemoteWorkClockOut(
      attendance.id,
      latitude,
      longitude,
    );

    // Calculate total hours
    const clockOutTime = new Date();
    const totalHours = (clockOutTime.getTime() - new Date(attendance.clock_in_time).getTime()) / (1000 * 60 * 60);

    // Validate reasonable work hours (0.5 to 16 hours)
    if (totalHours < 0.5) {
      throw new AttendanceStateException('insufficient_work_time', 'remote-clock-out', userId);
    }

    if (totalHours > 16) {
      this.logger.warn(`Unusually long remote work day detected for user ${userId}: ${totalHours} hours`);
    }

    return {
      fraudAnalysis,
      totalHours: Math.round(totalHours * 100) / 100,
    };
  }

  /**
   * Validate user-entity relationship integrity
   */
  private async validateUserEntityIntegrity(
    queryRunner: QueryRunner,
    userId: string,
    entityId: string,
  ): Promise<void> {
    // Check if user has access to entity through direct assignment or department
    const hasDirectAccess = await queryRunner.manager
      .createQueryBuilder()
      .select('assignment')
      .from('user_entity_assignments', 'assignment')
      .where('assignment.user_id = :userId', { userId })
      .andWhere('assignment.entity_id = :entityId', { entityId })
      .getOne();

    if (hasDirectAccess) {
      return; // User has direct access
    }

    // Check department-based access (this would require joining with user's department)
    // For now, we'll use the geospatial service's validation
    const integrityCheck = await this.fraudDetectionService.validateUserEntityIntegrity(userId, entityId);
    
    if (!integrityCheck.isValid) {
      throw new ReferentialIntegrityException('user', userId, 'entity', entityId);
    }
  }
}
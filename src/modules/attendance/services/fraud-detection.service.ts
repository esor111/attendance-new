import { Injectable, Logger } from '@nestjs/common';
import { GeospatialService } from './geospatial.service';
import { DailyAttendanceRepository } from '../repositories/daily-attendance.repository';
import { AttendanceSessionRepository } from '../repositories/attendance-session.repository';
import { LocationLogRepository } from '../repositories/location-log.repository';
import {
  FraudDetectionServiceInterface,
  FraudAnalysisResult,
} from '../interfaces/attendance.interface';

/**
 * Fraud Detection Service - Analyzes attendance patterns for suspicious activities
 * Implements travel speed analysis, location validation, and pattern detection
 * Flags records that exceed reasonable travel speeds or show impossible movements
 */
@Injectable()
export class FraudDetectionService implements FraudDetectionServiceInterface {
  private readonly logger = new Logger(FraudDetectionService.name);
  private readonly SUSPICIOUS_SPEED_THRESHOLD = 200; // km/h - impossible for normal travel
  private readonly HIGH_SPEED_THRESHOLD = 100; // km/h - suspicious but possible
  private readonly MEDIUM_SPEED_THRESHOLD = 60; // km/h - worth monitoring
  
  // Pattern analysis thresholds
  private readonly PATTERN_ANALYSIS_DAYS = 30; // Days to look back for pattern analysis
  private readonly SUSPICIOUS_PATTERN_THRESHOLD = 3; // Number of suspicious activities to trigger pattern flag
  private readonly REPEATED_LOCATION_THRESHOLD = 5; // Number of times same suspicious location used

  constructor(
    private readonly geospatialService: GeospatialService,
    private readonly attendanceRepository: DailyAttendanceRepository,
    private readonly sessionRepository: AttendanceSessionRepository,
    private readonly locationLogRepository: LocationLogRepository,
  ) {}

  /**
   * Analyze clock-in location for potential fraud
   * Checks against previous day's clock-out location if available
   */
  async analyzeClockInLocation(
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<FraudAnalysisResult> {
    try {
      // Get yesterday's attendance to check travel from previous clock-out
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const previousAttendance = await this.attendanceRepository.findByUserIdAndDate(userId, yesterday);
      
      if (!previousAttendance || !previousAttendance.clockOutLatitude || !previousAttendance.clockOutLongitude) {
        // No previous location to compare, consider safe
        return {
          isSuspicious: false,
          riskLevel: 'low',
        };
      }

      // Calculate time difference (assuming clock-out was end of previous day, clock-in is start of current day)
      const timeDiffHours = this.calculateTimeDifferenceBetweenDays(
        previousAttendance.clockOutTime || new Date(),
        new Date(),
      );

      const distance = this.geospatialService.calculateDistance(
        previousAttendance.clockOutLatitude,
        previousAttendance.clockOutLongitude,
        latitude,
        longitude,
      );

      const travelSpeed = this.geospatialService.calculateTravelSpeed(distance, timeDiffHours * 60);

      return this.analyzeTravelSpeed(travelSpeed, distance, timeDiffHours * 60, {
        previousLocation: {
          lat: previousAttendance.clockOutLatitude,
          lng: previousAttendance.clockOutLongitude,
          time: previousAttendance.clockOutTime,
        },
        currentLocation: {
          lat: latitude,
          lng: longitude,
          time: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error analyzing clock-in location for user ${userId}:`, error);
      return {
        isSuspicious: false,
        riskLevel: 'low',
      };
    }
  }

  /**
   * Analyze clock-out travel from clock-in location
   */
  async analyzeClockOutTravel(
    attendanceId: string,
    latitude: number,
    longitude: number,
  ): Promise<FraudAnalysisResult> {
    try {
      const attendance = await this.attendanceRepository.findById(attendanceId);
      
      if (!attendance || !attendance.clockInLatitude || !attendance.clockInLongitude || !attendance.clockInTime) {
        return {
          isSuspicious: false,
          riskLevel: 'low',
        };
      }

      const timeDiffMinutes = this.calculateTimeDifferenceMinutes(
        attendance.clockInTime,
        new Date(),
      );

      const distance = this.geospatialService.calculateDistance(
        attendance.clockInLatitude,
        attendance.clockInLongitude,
        latitude,
        longitude,
      );

      const travelSpeed = this.geospatialService.calculateTravelSpeed(distance, timeDiffMinutes);

      return this.analyzeTravelSpeed(travelSpeed, distance, timeDiffMinutes, {
        previousLocation: {
          lat: attendance.clockInLatitude,
          lng: attendance.clockInLongitude,
          time: attendance.clockInTime,
        },
        currentLocation: {
          lat: latitude,
          lng: longitude,
          time: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error analyzing clock-out travel for attendance ${attendanceId}:`, error);
      return {
        isSuspicious: false,
        riskLevel: 'low',
      };
    }
  }

  /**
   * Analyze session travel between check-in and check-out
   */
  async analyzeSessionTravel(
    sessionId: string,
    latitude: number,
    longitude: number,
  ): Promise<FraudAnalysisResult> {
    try {
      const session = await this.sessionRepository.findById(sessionId);
      
      if (!session || !session.checkInTime) {
        return {
          isSuspicious: false,
          riskLevel: 'low',
        };
      }

      const timeDiffMinutes = this.calculateTimeDifferenceMinutes(
        session.checkInTime,
        new Date(),
      );

      const distance = this.geospatialService.calculateDistance(
        session.checkInLatitude,
        session.checkInLongitude,
        latitude,
        longitude,
      );

      const travelSpeed = this.geospatialService.calculateTravelSpeed(distance, timeDiffMinutes);

      return this.analyzeTravelSpeed(travelSpeed, distance, timeDiffMinutes, {
        previousLocation: {
          lat: session.checkInLatitude,
          lng: session.checkInLongitude,
          time: session.checkInTime,
        },
        currentLocation: {
          lat: latitude,
          lng: longitude,
          time: new Date(),
        },
        sessionType: session.sessionType,
      });
    } catch (error) {
      this.logger.error(`Error analyzing session travel for session ${sessionId}:`, error);
      return {
        isSuspicious: false,
        riskLevel: 'low',
      };
    }
  }

  /**
   * Analyze location log travel between different client sites
   */
  async analyzeLocationLogTravel(
    previousLogId: string,
    currentLat: number,
    currentLng: number,
  ): Promise<FraudAnalysisResult> {
    try {
      const previousLog = await this.locationLogRepository.findById(previousLogId);
      
      if (!previousLog || !previousLog.checkOutLatitude || !previousLog.checkOutLongitude || !previousLog.checkOutTime) {
        return {
          isSuspicious: false,
          riskLevel: 'low',
        };
      }

      const timeDiffMinutes = this.calculateTimeDifferenceMinutes(
        previousLog.checkOutTime,
        new Date(),
      );

      const distance = this.geospatialService.calculateDistance(
        previousLog.checkOutLatitude,
        previousLog.checkOutLongitude,
        currentLat,
        currentLng,
      );

      const travelSpeed = this.geospatialService.calculateTravelSpeed(distance, timeDiffMinutes);

      return this.analyzeTravelSpeed(travelSpeed, distance, timeDiffMinutes, {
        previousLocation: {
          lat: previousLog.checkOutLatitude,
          lng: previousLog.checkOutLongitude,
          time: previousLog.checkOutTime,
        },
        currentLocation: {
          lat: currentLat,
          lng: currentLng,
          time: new Date(),
        },
        previousSite: previousLog.placeName,
      });
    } catch (error) {
      this.logger.error(`Error analyzing location log travel from log ${previousLogId}:`, error);
      return {
        isSuspicious: false,
        riskLevel: 'low',
      };
    }
  }

  /**
   * Flag suspicious activity in the database
   */
  async flagSuspiciousActivity(
    recordId: string,
    recordType: 'attendance' | 'session' | 'location_log',
    reason: string,
  ): Promise<void> {
    try {
      switch (recordType) {
        case 'attendance':
          await this.attendanceRepository.update(recordId, {
            isFlagged: true,
            flagReason: reason,
          });
          break;
        case 'session':
          await this.sessionRepository.update(recordId, {
            isFlagged: true,
            flagReason: reason,
          });
          break;
        case 'location_log':
          await this.locationLogRepository.update(recordId, {
            isFlagged: true,
            flagReason: reason,
          });
          break;
      }

      this.logger.warn(`Flagged ${recordType} ${recordId}: ${reason}`);
    } catch (error) {
      this.logger.error(`Error flagging ${recordType} ${recordId}:`, error);
    }
  }

  /**
   * Analyze user patterns for repeated suspicious behavior
   * Checks for patterns over the last 30 days
   */
  async analyzeUserPatterns(userId: string): Promise<{
    hasPattern: boolean;
    patternType: string;
    occurrences: number;
    riskLevel: 'low' | 'medium' | 'high';
    details: any;
  }> {5
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - this.PATTERN_ANALYSIS_DAYS);

      // Get user's attendance history
      const attendanceHistory = await this.attendanceRepository.findByUserIdAndDateRange(
        userId,
        startDate,
        endDate,
      );

      // Analyze different pattern types
      const speedViolations = this.analyzeSpeedPatterns(attendanceHistory);
      const locationPatterns = this.analyzeLocationPatterns(attendanceHistory);
      const timePatterns = this.analyzeTimePatterns(attendanceHistory);

      // Determine overall pattern risk
      const totalSuspiciousActivities = speedViolations.count + locationPatterns.count + timePatterns.count;
      
      let hasPattern = false;
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      let patternType = 'none';

      if (totalSuspiciousActivities >= this.SUSPICIOUS_PATTERN_THRESHOLD) {
        hasPattern = true;
        
        if (totalSuspiciousActivities >= 10) {
          riskLevel = 'high';
        } else if (totalSuspiciousActivities >= 5) {
          riskLevel = 'medium';
        } else {
          riskLevel = 'medium';
        }

        // Determine primary pattern type
        if (speedViolations.count >= locationPatterns.count && speedViolations.count >= timePatterns.count) {
          patternType = 'speed_violations';
        } else if (locationPatterns.count >= timePatterns.count) {
          patternType = 'location_anomalies';
        } else {
          patternType = 'time_anomalies';
        }
      }

      return {
        hasPattern,
        patternType,
        occurrences: totalSuspiciousActivities,
        riskLevel,
        details: {
          speedViolations,
          locationPatterns,
          timePatterns,
          analysisWindow: {
            startDate,
            endDate,
            totalDays: this.PATTERN_ANALYSIS_DAYS,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Error analyzing patterns for user ${userId}:`, error);
      return {
        hasPattern: false,
        patternType: 'error',
        occurrences: 0,
        riskLevel: 'low',
        details: { error: error.message },
      };
    }
  }

  /**
   * Validate referential integrity for user-entity relationships
   */
  async validateUserEntityIntegrity(userId: string, entityId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if user exists (this would typically be done via handshake service)
      // For now, we'll assume user exists if we have attendance records
      const userAttendance = await this.attendanceRepository.findByUserIdAndDateRange(
        userId,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        new Date(),
      );

      if (userAttendance.length === 0) {
        warnings.push('User has no recent attendance records');
      }

      // Check entity access through geospatial service
      // This would validate against user entity assignments and department assignments
      // Implementation depends on the geospatial service having access validation

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      this.logger.error(`Error validating user-entity integrity for ${userId}-${entityId}:`, error);
      errors.push('Failed to validate user-entity relationship');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }
  }

  /**
   * Analyze travel speed and determine risk level
   */
  private analyzeTravelSpeed(
    travelSpeedKmph: number,
    distance: number,
    timeMinutes: number,
    details: any,
  ): FraudAnalysisResult {
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let isSuspicious = false;
    let flagReason: string | undefined;

    if (travelSpeedKmph >= this.SUSPICIOUS_SPEED_THRESHOLD) {
      riskLevel = 'high';
      isSuspicious = true;
      flagReason = `Impossible travel speed: ${Math.round(travelSpeedKmph)}km/h over ${Math.round(distance)}m in ${Math.round(timeMinutes)} minutes`;
    } else if (travelSpeedKmph >= this.HIGH_SPEED_THRESHOLD) {
      riskLevel = 'high';
      isSuspicious = true;
      flagReason = `Very high travel speed: ${Math.round(travelSpeedKmph)}km/h - possible location spoofing`;
    } else if (travelSpeedKmph >= this.MEDIUM_SPEED_THRESHOLD) {
      riskLevel = 'medium';
      isSuspicious = true;
      flagReason = `High travel speed: ${Math.round(travelSpeedKmph)}km/h - requires review`;
    }

    return {
      isSuspicious,
      travelSpeedKmph: Math.round(travelSpeedKmph * 100) / 100, // Round to 2 decimal places
      flagReason,
      riskLevel,
      details: {
        ...details,
        distance: Math.round(distance),
        timeMinutes: Math.round(timeMinutes),
      },
    };
  }

  /**
   * Calculate time difference in minutes between two dates
   */
  private calculateTimeDifferenceMinutes(startTime: Date, endTime: Date): number {
    const diffMs = endTime.getTime() - startTime.getTime();
    return Math.max(1, diffMs / (1000 * 60)); // Minimum 1 minute to avoid division by zero
  }

  /**
   * Calculate time difference in hours between days (for overnight analysis)
   */
  private calculateTimeDifferenceBetweenDays(
    previousClockOut: Date,
    currentClockIn: Date,
  ): number {
    // Assume reasonable overnight gap (12-16 hours)
    const diffMs = currentClockIn.getTime() - previousClockOut.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    // If the difference is too small (same day) or too large (multiple days), use default
    if (diffHours < 8 || diffHours > 24) {
      return 12; // Default 12-hour gap
    }
    
    return diffHours;
  }

  /**
   * Analyze speed violation patterns in attendance history
   */
  private analyzeSpeedPatterns(attendanceHistory: any[]): {
    count: number;
    averageSpeed: number;
    maxSpeed: number;
    violations: any[];
  } {
    const violations = attendanceHistory.filter(
      (attendance) => attendance.isFlagged && attendance.travelSpeedKmph > this.MEDIUM_SPEED_THRESHOLD
    );

    const speeds = violations
      .map((v) => v.travelSpeedKmph)
      .filter((speed) => speed != null);

    return {
      count: violations.length,
      averageSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
      maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
      violations: violations.map((v) => ({
        date: v.date,
        speed: v.travelSpeedKmph,
        flagReason: v.flagReason,
      })),
    };
  }

  /**
   * Analyze location-based patterns in attendance history
   */
  private analyzeLocationPatterns(attendanceHistory: any[]): {
    count: number;
    suspiciousLocations: any[];
    repeatedLocations: number;
  } {
    const locationViolations = attendanceHistory.filter(
      (attendance) => attendance.isFlagged && attendance.flagReason?.includes('location')
    );

    // Group by approximate location (rounded to reduce precision)
    const locationGroups = new Map<string, any[]>();
    
    locationViolations.forEach((violation) => {
      if (violation.clockInLatitude && violation.clockInLongitude) {
        const locationKey = `${Math.round(violation.clockInLatitude * 1000)},${Math.round(violation.clockInLongitude * 1000)}`;
        if (!locationGroups.has(locationKey)) {
          locationGroups.set(locationKey, []);
        }
        locationGroups.get(locationKey)!.push(violation);
      }
    });

    const repeatedLocations = Array.from(locationGroups.values()).filter(
      (group) => group.length >= this.REPEATED_LOCATION_THRESHOLD
    ).length;

    return {
      count: locationViolations.length,
      suspiciousLocations: Array.from(locationGroups.entries()).map(([key, violations]) => ({
        location: key,
        occurrences: violations.length,
        dates: violations.map((v) => v.date),
      })),
      repeatedLocations,
    };
  }

  /**
   * Analyze time-based patterns in attendance history
   */
  private analyzeTimePatterns(attendanceHistory: any[]): {
    count: number;
    unusualTimes: any[];
    consistencyScore: number;
  } {
    const timeViolations = attendanceHistory.filter(
      (attendance) => attendance.isFlagged && attendance.flagReason?.includes('time')
    );

    // Analyze clock-in time consistency
    const clockInTimes = attendanceHistory
      .filter((a) => a.clockInTime)
      .map((a) => {
        const time = new Date(a.clockInTime);
        return time.getHours() * 60 + time.getMinutes(); // Convert to minutes from midnight
      });

    let consistencyScore = 0;
    if (clockInTimes.length > 1) {
      const avgTime = clockInTimes.reduce((a, b) => a + b, 0) / clockInTimes.length;
      const variance = clockInTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / clockInTimes.length;
      const stdDev = Math.sqrt(variance);
      
      // Lower standard deviation = higher consistency (inverted scale 0-100)
      consistencyScore = Math.max(0, 100 - stdDev / 2);
    }

    return {
      count: timeViolations.length,
      unusualTimes: timeViolations.map((v) => ({
        date: v.date,
        clockInTime: v.clockInTime,
        clockOutTime: v.clockOutTime,
        flagReason: v.flagReason,
      })),
      consistencyScore: Math.round(consistencyScore),
    };
  }
}
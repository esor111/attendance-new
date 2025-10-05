import { DailyAttendance } from '../entities/daily-attendance.entity';
import { AttendanceSession } from '../entities/attendance-session.entity';
import { LocationLog } from '../entities/location-log.entity';
import { ClockInDto } from '../dto/clock-in.dto';
import { ClockOutDto } from '../dto/clock-out.dto';
import { SessionCheckInDto } from '../dto/session-check-in.dto';
import { SessionCheckOutDto } from '../dto/session-check-out.dto';
import { LocationCheckInDto } from '../dto/location-check-in.dto';
import { LocationCheckOutDto } from '../dto/location-check-out.dto';

/**
 * Attendance Service Interface - Defines core attendance operations
 * Covers daily attendance, session management, and field worker location tracking
 */
export interface AttendanceServiceInterface {
  // Daily attendance (start/end of day)
  clockIn(userId: string, dto: ClockInDto): Promise<DailyAttendance>;
  clockOut(userId: string, dto: ClockOutDto): Promise<DailyAttendance>;
  
  // Session management (breaks, meetings, etc.)
  sessionCheckIn(userId: string, dto: SessionCheckInDto): Promise<AttendanceSession>;
  sessionCheckOut(userId: string, dto: SessionCheckOutDto): Promise<AttendanceSession>;
  
  // Field worker location tracking
  locationCheckIn(userId: string, dto: LocationCheckInDto): Promise<LocationLog>;
  locationCheckOut(userId: string, dto: LocationCheckOutDto): Promise<LocationLog>;
  
  // Query methods
  getTodayAttendance(userId: string): Promise<DailyAttendance | null>;
  getAttendanceByDate(userId: string, date: Date): Promise<DailyAttendance | null>;
  getUserAttendanceHistory(userId: string, startDate: Date, endDate: Date): Promise<DailyAttendance[]>;
  getCurrentSession(userId: string): Promise<AttendanceSession | null>;
  getCurrentLocationLog(userId: string): Promise<LocationLog | null>;
}

/**
 * Geospatial Service Interface - Defines location and distance operations
 * Handles coordinate validation, distance calculations, and entity access resolution
 */
export interface GeospatialServiceInterface {
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number;
  calculateTravelSpeed(distance: number, timeMinutes: number): number;
  findNearestAuthorizedEntity(userId: string, latitude: number, longitude: number): Promise<EntityDistanceResult>;
  isWithinRadius(entityLat: number, entityLng: number, userLat: number, userLng: number, radiusMeters: number): boolean;
  validateLocationAccess(userId: string, latitude: number, longitude: number): Promise<LocationValidationResult>;
}

/**
 * Fraud Detection Service Interface - Defines fraud analysis operations
 * Analyzes travel patterns and flags suspicious activities
 */
export interface FraudDetectionServiceInterface {
  analyzeClockInLocation(userId: string, latitude: number, longitude: number): Promise<FraudAnalysisResult>;
  analyzeClockOutTravel(attendanceId: string, latitude: number, longitude: number): Promise<FraudAnalysisResult>;
  analyzeSessionTravel(sessionId: string, latitude: number, longitude: number): Promise<FraudAnalysisResult>;
  analyzeLocationLogTravel(previousLogId: string, currentLat: number, currentLng: number): Promise<FraudAnalysisResult>;
  flagSuspiciousActivity(recordId: string, recordType: 'attendance' | 'session' | 'location_log', reason: string): Promise<void>;
}

/**
 * Entity Distance Result - Result of finding nearest authorized entity
 */
export interface EntityDistanceResult {
  entityId: string;
  entityName: string;
  distance: number;
  isWithinRadius: boolean;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

/**
 * Location Validation Result - Result of validating user location access
 */
export interface LocationValidationResult {
  isValid: boolean;
  entity?: EntityDistanceResult;
  errorMessage?: string;
  nearestEntities?: EntityDistanceResult[];
}

/**
 * Fraud Analysis Result - Result of fraud detection analysis
 */
export interface FraudAnalysisResult {
  isSuspicious: boolean;
  travelSpeedKmph?: number;
  flagReason?: string;
  riskLevel: 'low' | 'medium' | 'high';
  details?: Record<string, any>;
}
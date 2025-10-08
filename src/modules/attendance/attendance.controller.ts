import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AttendanceService } from './services/attendance.service';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { SessionCheckInDto } from './dto/session-check-in.dto';
import { SessionCheckOutDto } from './dto/session-check-out.dto';
import { LocationCheckInDto } from './dto/location-check-in.dto';
import { LocationCheckOutDto } from './dto/location-check-out.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

/**
 * Attendance Controller - Handles HTTP requests for attendance operations
 * Provides endpoints for daily attendance, sessions, and field worker location tracking
 * All endpoints require JWT authentication
 */
@Controller('api/attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * Clock-in endpoint - Start daily attendance
   * Supports both office and field work locations
   */
  @Post('clock-in')
  async clockIn(@CurrentUser() user: any, @Body() clockInDto: ClockInDto) {
    return await this.attendanceService.clockIn(user.id, clockInDto);
  }

  /**
   * Clock-out endpoint - End daily attendance
   */
  @Post('clock-out')
  async clockOut(@CurrentUser() user: any, @Body() clockOutDto: ClockOutDto) {
    return await this.attendanceService.clockOut(user.id, clockOutDto);
  }

  /**
   * Get today's attendance status
   */
  @Get('today')
  async getTodayAttendance(@CurrentUser() user: any) {
    return await this.attendanceService.getTodayAttendance(user.id);
  }

  /**
   * Get attendance history with date range filtering
   */
  @Get('history')
  async getAttendanceHistory(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const end = endDate ? new Date(endDate) : new Date();
    
    return await this.attendanceService.getUserAttendanceHistory(user.id, start, end);
  }

  /**
   * Session check-in endpoint - Start break, meeting, etc.
   */
  @Post('session/check-in')
  async sessionCheckIn(@CurrentUser() user: any, @Body() sessionCheckInDto: SessionCheckInDto) {
    return await this.attendanceService.sessionCheckIn(user.id, sessionCheckInDto);
  }

  /**
   * Session check-out endpoint - End session
   */
  @Post('session/check-out')
  async sessionCheckOut(@CurrentUser() user: any, @Body() sessionCheckOutDto: SessionCheckOutDto) {
    return await this.attendanceService.sessionCheckOut(user.id, sessionCheckOutDto);
  }

  /**
   * Get current active session
   */
  @Get('session/current')
  async getCurrentSession(@CurrentUser() user: any) {
    return await this.attendanceService.getCurrentSession(user.id);
  }

  /**
   * Location check-in endpoint - Field worker client site visit
   */
  @Post('location/check-in')
  async locationCheckIn(@CurrentUser() user: any, @Body() locationCheckInDto: LocationCheckInDto) {
    return await this.attendanceService.locationCheckIn(user.id, locationCheckInDto);
  }

  /**
   * Location check-out endpoint - End client site visit
   */
  @Post('location/check-out')
  async locationCheckOut(@CurrentUser() user: any, @Body() locationCheckOutDto: LocationCheckOutDto) {
    return await this.attendanceService.locationCheckOut(user.id, locationCheckOutDto);
  }

  /**
   * Get current active location log
   */
  @Get('location/current')
  async getCurrentLocationLog(@CurrentUser() user: any) {
    return await this.attendanceService.getCurrentLocationLog(user.id);
  }

  /**
   * Get location visit history
   */
  @Get('location/history')
  async getLocationHistory(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    return await this.attendanceService.getLocationHistory(user.id, start, end);
  }

  /**
   * Get flagged attendance records
   */
  @Get('flagged')
  async getFlaggedRecords(@Query('limit') limit?: string) {
    const recordLimit = limit ? parseInt(limit) : 50;
    return await this.attendanceService.getFlaggedRecords(recordLimit);
  }
}
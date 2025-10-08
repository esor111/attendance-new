import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    ParseIntPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AttendanceService } from '../services/attendance.service';
import { ClockInDto } from '../dto/clock-in.dto';
import { ClockOutDto } from '../dto/clock-out.dto';
import { SessionCheckInDto } from '../dto/session-check-in.dto';
import { SessionCheckOutDto } from '../dto/session-check-out.dto';
import { LocationCheckInDto } from '../dto/location-check-in.dto';
import { LocationCheckOutDto } from '../dto/location-check-out.dto';

/**
 * Attendance Controller - Handles all attendance-related HTTP requests
 * Provides endpoints for daily attendance, session management, and field worker location tracking
 * Integrates with geospatial validation and fraud detection
 */
@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/attendance')
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) { }

    /**
     * Clock-in - Start daily attendance
     */
    @Post('clock-in')
    @ApiOperation({
        summary: 'Clock-in for daily attendance',
        description: 'Start daily attendance with location validation and entity assignment',
    })
    @ApiResponse({
        status: 201,
        description: 'Successfully clocked in',
        schema: {
            example: {
                id: 'attendance-uuid',
                userId: 'user-uuid',
                date: '2025-10-05',
                clockInTime: '2025-10-05T09:00:00Z',
                clockInLatitude: 27.7172,
                clockInLongitude: 85.3240,
                entityId: 'entity-uuid',
                isWithinRadius: true,
                isFlagged: false,
                status: 'Present',
                notes: 'Starting work',
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Invalid location or already clocked in' })
    @ApiResponse({ status: 409, description: 'Already clocked in for today' })
    async clockIn(@Request() req: any, @Body() clockInDto: ClockInDto) {
        return await this.attendanceService.clockIn(req.user.userId, clockInDto);
    }

    /**
     * Clock-out - End daily attendance
     */
    @Post('clock-out')
    @ApiOperation({
        summary: 'Clock-out from daily attendance',
        description: 'End daily attendance with travel speed calculation and total hours',
    })
    @ApiResponse({
        status: 200,
        description: 'Successfully clocked out',
        schema: {
            example: {
                id: 'attendance-uuid',
                clockOutTime: '2025-10-05T17:30:00Z',
                clockOutLatitude: 27.7175,
                clockOutLongitude: 85.3245,
                totalHours: 8.5,
                travelSpeedKmph: 2.5,
                isFlagged: false,
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Not clocked in or active session exists' })
    @ApiResponse({ status: 404, description: 'No attendance record found' })
    async clockOut(@Request() req: any, @Body() clockOutDto: ClockOutDto) {
        return await this.attendanceService.clockOut(req.user.userId, clockOutDto);
    }

    /**
     * Session check-in - Start break, meeting, or other session
     */
    @Post('session/check-in')
    @ApiOperation({
        summary: 'Start a session (break, meeting, etc.)',
        description: 'Check-in for breaks, meetings, or other activities during workday',
    })
    @ApiResponse({
        status: 201,
        description: 'Successfully started session',
        schema: {
            example: {
                id: 'session-uuid',
                attendanceId: 'attendance-uuid',
                checkInTime: '2025-10-05T11:00:00Z',
                checkInLatitude: 27.7172,
                checkInLongitude: 85.3240,
                sessionType: 'break',
                isWithinRadius: true,
                notes: 'Coffee break',
            },
        },
    })
    @ApiResponse({ status: 400, description: 'No daily attendance or invalid location' })
    @ApiResponse({ status: 409, description: 'Active session already exists' })
    async sessionCheckIn(@Request() req: any, @Body() sessionCheckInDto: SessionCheckInDto) {
        return await this.attendanceService.sessionCheckIn(req.user.userId, sessionCheckInDto);
    }

    /**
     * Session check-out - End current session
     */
    @Post('session/check-out')
    @ApiOperation({
        summary: 'End current session',
        description: 'Check-out from current session with duration calculation',
    })
    @ApiResponse({
        status: 200,
        description: 'Successfully ended session',
        schema: {
            example: {
                id: 'session-uuid',
                checkOutTime: '2025-10-05T11:30:00Z',
                checkOutLatitude: 27.7175,
                checkOutLongitude: 85.3245,
                sessionDurationMinutes: 30,
                travelSpeedKmph: 1.2,
                isFlagged: false,
            },
        },
    })
    @ApiResponse({ status: 400, description: 'No active session to check out from' })
    async sessionCheckOut(@Request() req: any, @Body() sessionCheckOutDto: SessionCheckOutDto) {
        return await this.attendanceService.sessionCheckOut(req.user.userId, sessionCheckOutDto);
    }

    /**
     * Location check-in - Field worker client site visit
     */
    @Post('location/check-in')
    @ApiOperation({
        summary: 'Check-in to client location',
        description: 'Field worker check-in for client site visits',
    })
    @ApiResponse({
        status: 201,
        description: 'Successfully checked in to location',
        schema: {
            example: {
                id: 'location-log-uuid',
                attendanceId: 'attendance-uuid',
                entityId: 'client-entity-uuid',
                placeName: 'Client Site A',
                checkInTime: '2025-10-05T10:30:00Z',
                checkInLatitude: 27.7200,
                checkInLongitude: 85.3300,
                isWithinRadius: true,
                purpose: 'Client meeting',
            },
        },
    })
    @ApiResponse({ status: 400, description: 'No daily attendance or no entity access' })
    @ApiResponse({ status: 409, description: 'Active location check-in already exists' })
    async locationCheckIn(@Request() req: any, @Body() locationCheckInDto: LocationCheckInDto) {
        return await this.attendanceService.locationCheckIn(req.user.userId, locationCheckInDto);
    }

    /**
     * Location check-out - End client site visit
     */
    @Post('location/check-out')
    @ApiOperation({
        summary: 'Check-out from client location',
        description: 'End client site visit with duration calculation',
    })
    @ApiResponse({
        status: 200,
        description: 'Successfully checked out from location',
        schema: {
            example: {
                id: 'location-log-uuid',
                checkOutTime: '2025-10-05T12:00:00Z',
                checkOutLatitude: 27.7205,
                checkOutLongitude: 85.3305,
                visitDurationMinutes: 90,
                travelSpeedKmph: 15.5,
                isFlagged: false,
            },
        },
    })
    @ApiResponse({ status: 400, description: 'No active location check-in to check out from' })
    async locationCheckOut(@Request() req: any, @Body() locationCheckOutDto: LocationCheckOutDto) {
        return await this.attendanceService.locationCheckOut(req.user.userId, locationCheckOutDto);
    }

    /**
     * Get today's attendance status
     */
    @Get('today')
    @ApiOperation({
        summary: 'Get today\'s attendance status',
        description: 'Retrieve current day attendance record with sessions and location logs',
    })
    @ApiResponse({
        status: 200,
        description: 'Today\'s attendance record',
        schema: {
            example: {
                id: 'attendance-uuid',
                userId: 'user-uuid',
                date: '2025-10-05',
                clockInTime: '2025-10-05T09:00:00Z',
                clockOutTime: null,
                totalHours: null,
                status: 'Present',
                entity: {
                    id: 'entity-uuid',
                    name: 'ABC Company HQ',
                },
                attendanceSessions: [],
                locationLogs: [],
            },
        },
    })
    async getTodayAttendance(@Request() req: any) {
        return await this.attendanceService.getTodayAttendance(req.user.userId);
    }

    /**
     * Get attendance history
     */
    @Get('history')
    @ApiOperation({
        summary: 'Get attendance history',
        description: 'Retrieve attendance records for a date range',
    })
    @ApiQuery({ name: 'startDate', type: String, example: '2025-10-01' })
    @ApiQuery({ name: 'endDate', type: String, example: '2025-10-31' })
    @ApiResponse({
        status: 200,
        description: 'Attendance history records',
        schema: {
            example: [
                {
                    id: 'attendance-uuid-1',
                    date: '2025-10-04',
                    clockInTime: '2025-10-04T09:00:00Z',
                    clockOutTime: '2025-10-04T17:30:00Z',
                    totalHours: 8.5,
                    status: 'Present',
                    isFlagged: false,
                },
                {
                    id: 'attendance-uuid-2',
                    date: '2025-10-03',
                    clockInTime: '2025-10-03T09:15:00Z',
                    clockOutTime: '2025-10-03T17:45:00Z',
                    totalHours: 8.5,
                    status: 'Late',
                    isFlagged: false,
                },
            ],
        },
    })
    async getAttendanceHistory(
        @Request() req: any,
        @Query('startDate') startDateStr: string,
        @Query('endDate') endDateStr: string,
    ) {
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        return await this.attendanceService.getUserAttendanceHistory(req.user.userId, startDate, endDate);
    }

    /**
     * Get current active session
     */
    @Get('session/current')
    @ApiOperation({
        summary: 'Get current active session',
        description: 'Retrieve currently active session if any',
    })
    @ApiResponse({
        status: 200,
        description: 'Current active session or null',
        schema: {
            example: {
                id: 'session-uuid',
                attendanceId: 'attendance-uuid',
                checkInTime: '2025-10-05T11:00:00Z',
                checkOutTime: null,
                sessionType: 'break',
                notes: 'Coffee break',
            },
        },
    })
    async getCurrentSession(@Request() req: any) {
        return await this.attendanceService.getCurrentSession(req.user.userId);
    }

    /**
     * Get current active location log
     */
    @Get('location/current')
    @ApiOperation({
        summary: 'Get current active location log',
        description: 'Retrieve currently active location check-in if any',
    })
    @ApiResponse({
        status: 200,
        description: 'Current active location log or null',
        schema: {
            example: {
                id: 'location-log-uuid',
                attendanceId: 'attendance-uuid',
                entityId: 'client-entity-uuid',
                placeName: 'Client Site A',
                checkInTime: '2025-10-05T10:30:00Z',
                checkOutTime: null,
                purpose: 'Client meeting',
            },
        },
    })
    async getCurrentLocationLog(@Request() req: any) {
        return await this.attendanceService.getCurrentLocationLog(req.user.userId);
    }

    /**
     * Get location visit history
     */
    @Get('location/history')
    @ApiOperation({
        summary: 'Get location visit history',
        description: 'Retrieve field worker location visit history for a date range',
    })
    @ApiQuery({ name: 'startDate', type: String, example: '2025-10-01' })
    @ApiQuery({ name: 'endDate', type: String, example: '2025-10-31' })
    @ApiResponse({
        status: 200,
        description: 'Location visit history',
        schema: {
            example: [
                {
                    id: 'location-log-uuid-1',
                    placeName: 'Client Site A',
                    checkInTime: '2025-10-04T10:30:00Z',
                    checkOutTime: '2025-10-04T12:00:00Z',
                    visitDurationMinutes: 90,
                    purpose: 'Client meeting',
                    isFlagged: false,
                },
            ],
        },
    })
    async getLocationHistory(
        @Request() req: any,
        @Query('startDate') startDateStr: string,
        @Query('endDate') endDateStr: string,
    ) {
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        return await this.attendanceService.getLocationHistory(req.user.userId, startDate, endDate);
    }

    /**
     * Get flagged records for review
     */
    @Get('flagged')
    @ApiOperation({
        summary: 'Get flagged attendance records',
        description: 'Retrieve attendance records flagged for suspicious activity (admin only)',
    })
    @ApiQuery({ name: 'limit', type: Number, required: false, example: 50 })
    @ApiResponse({
        status: 200,
        description: 'Flagged attendance records',
        schema: {
            example: {
                attendance: [
                    {
                        id: 'attendance-uuid',
                        userId: 'user-uuid',
                        date: '2025-10-05',
                        isFlagged: true,
                        flagReason: 'Impossible travel speed detected',
                        travelSpeedKmph: 250.5,
                    },
                ],
                sessions: [],
                locationLogs: [],
            },
        },
    })
    async getFlaggedRecords(
        @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    ) {
        return await this.attendanceService.getFlaggedRecords(limit);
    }

    /**
     * Get attendance analytics and patterns
     */
    @Get('analytics')
    @ApiOperation({
        summary: 'Get attendance analytics',
        description: 'Retrieve attendance patterns and analytics for the authenticated user',
    })
    @ApiQuery({ name: 'startDate', type: String, example: '2025-10-01' })
    @ApiQuery({ name: 'endDate', type: String, example: '2025-10-31' })
    @ApiResponse({
        status: 200,
        description: 'Attendance analytics and patterns',
        schema: {
            example: {
                summary: {
                    totalDays: 23,
                    presentDays: 20,
                    absentDays: 3,
                    lateDays: 2,
                    averageHours: 8.2,
                    totalHours: 164.5,
                    flaggedDays: 1,
                },
                patterns: {
                    averageClockInTime: '09:05:00',
                    averageClockOutTime: '17:35:00',
                    mostCommonEntity: 'ABC Company HQ',
                    sessionBreakdown: {
                        work: 85,
                        break: 10,
                        lunch: 3,
                        meeting: 2,
                    },
                },
                trends: {
                    weeklyHours: [40.5, 42.0, 38.5, 41.0],
                    punctualityTrend: 'improving',
                    locationConsistency: 95.5,
                },
            },
        },
    })
    async getAttendanceAnalytics(
        @Request() req: any,
        @Query('startDate') startDateStr: string,
        @Query('endDate') endDateStr: string,
    ) {
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        return await this.attendanceService.getAttendanceAnalytics(req.user.userId, startDate, endDate);
    }
}
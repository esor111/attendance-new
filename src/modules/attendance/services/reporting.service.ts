import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ReportingStructureRepository } from '../repositories/reporting-structure.repository';
import { DailyAttendanceRepository } from '../repositories/daily-attendance.repository';
import { LocationLogRepository } from '../repositories/location-log.repository';
import { AttendanceSessionRepository } from '../repositories/attendance-session.repository';
import { ReportingStructure } from '../entities/reporting-structure.entity';
import { DailyAttendance } from '../entities/daily-attendance.entity';
import { CreateReportingStructureDto } from '../dto/create-reporting-structure.dto';
import { UpdateReportingStructureDto } from '../dto/update-reporting-structure.dto';

/**
 * Reporting Service - Handles team reporting and manager access functionality
 * Manages employee-manager relationships and provides team attendance reports
 * Validates circular reporting relationships and ensures data access permissions
 */
@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    private readonly reportingStructureRepository: ReportingStructureRepository,
    private readonly attendanceRepository: DailyAttendanceRepository,
    private readonly locationLogRepository: LocationLogRepository,
    private readonly sessionRepository: AttendanceSessionRepository,
  ) {}

  /**
   * Create a new reporting relationship
   * Validates against circular reporting structures
   */
  async createReportingStructure(dto: CreateReportingStructureDto): Promise<ReportingStructure> {
    // Prevent self-reporting
    if (dto.employeeId === dto.managerId) {
      throw new BadRequestException('Employee cannot report to themselves');
    }

    // Check for circular reporting relationships
    const wouldCreateCircular = await this.reportingStructureRepository.findCircularRelationships(
      dto.employeeId,
      dto.managerId,
    );

    if (wouldCreateCircular) {
      throw new BadRequestException(
        'This reporting relationship would create a circular reporting structure',
      );
    }

    // Check if there's already an active relationship
    const existingRelationship = await this.reportingStructureRepository.existsRelationship(
      dto.employeeId,
      dto.managerId,
      dto.startDate,
    );

    if (existingRelationship) {
      throw new BadRequestException(
        'An active reporting relationship already exists between these users',
      );
    }

    const relationshipData = {
      employeeId: dto.employeeId,
      managerId: dto.managerId,
      startDate: dto.startDate,
      endDate: dto.endDate,
    };

    return await this.reportingStructureRepository.create(relationshipData);
  }

  /**
   * Update an existing reporting relationship
   */
  async updateReportingStructure(
    id: string,
    dto: UpdateReportingStructureDto,
  ): Promise<ReportingStructure> {
    const existing = await this.reportingStructureRepository.findById(id);
    if (!existing) {
      throw new BadRequestException('Reporting structure not found');
    }

    // If changing manager, validate circular relationships
    if (dto.managerId && dto.managerId !== existing.managerId) {
      const wouldCreateCircular = await this.reportingStructureRepository.findCircularRelationships(
        existing.employeeId,
        dto.managerId,
      );

      if (wouldCreateCircular) {
        throw new BadRequestException(
          'This change would create a circular reporting structure',
        );
      }
    }

    return await this.reportingStructureRepository.update(id, dto);
  }

  /**
   * End a reporting relationship
   */
  async endReportingStructure(id: string, endDate: Date): Promise<ReportingStructure> {
    return await this.reportingStructureRepository.endRelationship(id, endDate);
  }

  /**
   * Get team members for a manager
   */
  async getTeamMembers(managerId: string): Promise<ReportingStructure[]> {
    return await this.reportingStructureRepository.findCurrentTeamByManagerId(managerId);
  }

  /**
   * Get team attendance summary with statistics
   */
  async getTeamAttendanceSummary(
    managerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    teamMembers: DailyAttendance[];
    statistics: {
      totalDays: number;
      presentDays: number;
      absentDays: number;
      lateDays: number;
      flaggedDays: number;
    };
    teamMemberStats: Array<{
      userId: string;
      userName: string;
      presentDays: number;
      absentDays: number;
      lateDays: number;
      flaggedDays: number;
      averageHours: number;
    }>;
  }> {
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
        teamMemberStats: [],
      };
    }

    // Get attendance records for all team members
    const attendanceRecords = await this.attendanceRepository.findByUserIds(
      teamMemberIds,
      startDate,
      endDate,
    );

    // Get overall statistics
    const statistics = await this.attendanceRepository.getAttendanceStats(
      teamMemberIds,
      startDate,
      endDate,
    );

    // Calculate individual team member statistics
    const teamMemberStats = await this.calculateIndividualStats(teamMemberIds, startDate, endDate);

    return {
      teamMembers: attendanceRecords,
      statistics,
      teamMemberStats,
    };
  }

  /**
   * Get detailed attendance report for a specific team member
   */
  async getTeamMemberDetailedReport(
    managerId: string,
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    attendance: DailyAttendance[];
    locationLogs: any[];
    sessions: any[];
    statistics: {
      totalDays: number;
      presentDays: number;
      totalHours: number;
      averageHours: number;
      flaggedDays: number;
      locationVisits: number;
    };
  }> {
    // Verify manager has access to this employee
    const hasAccess = await this.reportingStructureRepository.existsRelationship(
      employeeId,
      managerId,
    );

    if (!hasAccess) {
      throw new BadRequestException('No access to this employee\'s attendance data');
    }

    // Get attendance records
    const attendance = await this.attendanceRepository.findByUserIdAndDateRange(
      employeeId,
      startDate,
      endDate,
    );

    // Get location logs
    const locationLogs = await this.locationLogRepository.findByUserIdAndDateRange(
      employeeId,
      startDate,
      endDate,
    );

    // Get sessions for each attendance record
    const attendanceIds = attendance.map(a => a.id);
    const sessions = await this.sessionRepository.findByAttendanceIds(attendanceIds);

    // Calculate statistics
    const statistics = this.calculateDetailedStats(attendance, locationLogs);

    return {
      attendance,
      locationLogs,
      sessions,
      statistics,
    };
  }

  /**
   * Get reporting chain for an employee
   */
  async getReportingChain(employeeId: string): Promise<ReportingStructure[]> {
    return await this.reportingStructureRepository.getReportingChain(employeeId);
  }

  /**
   * Get all subordinates for a manager (including indirect reports)
   */
  async getAllSubordinates(managerId: string): Promise<string[]> {
    return await this.reportingStructureRepository.getAllSubordinates(managerId);
  }

  /**
   * Validate manager access to employee data
   */
  async validateManagerAccess(managerId: string, employeeId: string): Promise<boolean> {
    return await this.reportingStructureRepository.existsRelationship(employeeId, managerId);
  }

  /**
   * Get team attendance for a specific date
   */
  async getTeamAttendanceByDate(
    managerId: string,
    date: Date,
  ): Promise<{
    date: Date;
    teamMembers: Array<{
      userId: string;
      userName: string;
      status: 'Present' | 'Absent' | 'Late' | 'On Leave';
      clockInTime?: Date;
      clockOutTime?: Date;
      totalHours?: number;
      isFlagged: boolean;
      currentLocation?: string;
    }>;
    summary: {
      total: number;
      present: number;
      absent: number;
      late: number;
      flagged: number;
    };
  }> {
    const teamMemberIds = await this.reportingStructureRepository.getTeamMemberIds(managerId);

    if (teamMemberIds.length === 0) {
      return {
        date,
        teamMembers: [],
        summary: {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          flagged: 0,
        },
      };
    }

    const attendanceRecords = await this.attendanceRepository.findByUserIds(
      teamMemberIds,
      date,
      date,
    );

    const teamMembers = teamMemberIds.map(userId => {
      const attendance = attendanceRecords.find(a => a.userId === userId);
      
      return {
        userId,
        userName: attendance?.user?.name || 'Unknown',
        status: (attendance?.status || 'Absent') as 'Present' | 'Late' | 'Absent' | 'On Leave',
        clockInTime: attendance?.clockInTime,
        clockOutTime: attendance?.clockOutTime,
        totalHours: attendance?.totalHours,
        isFlagged: attendance?.isFlagged || false,
        currentLocation: attendance?.entity?.name,
      };
    });

    const summary = {
      total: teamMembers.length,
      present: teamMembers.filter(m => m.status === 'Present').length,
      absent: teamMembers.filter(m => m.status === 'Absent').length,
      late: teamMembers.filter(m => m.status === 'Late').length,
      flagged: teamMembers.filter(m => m.isFlagged).length,
    };

    return {
      date,
      teamMembers,
      summary,
    };
  }

  /**
   * Calculate individual team member statistics
   */
  private async calculateIndividualStats(
    userIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{
    userId: string;
    userName: string;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    flaggedDays: number;
    averageHours: number;
  }>> {
    const stats: Array<{
      userId: string;
      userName: string;
      presentDays: number;
      absentDays: number;
      lateDays: number;
      flaggedDays: number;
      averageHours: number;
    }> = [];

    for (const userId of userIds) {
      const userAttendance = await this.attendanceRepository.findByUserIdAndDateRange(
        userId,
        startDate,
        endDate,
      );

      const presentDays = userAttendance.filter(a => a.clockInTime).length;
      const absentDays = userAttendance.filter(a => !a.clockInTime).length;
      const lateDays = userAttendance.filter(a => a.status === 'Late').length;
      const flaggedDays = userAttendance.filter(a => a.isFlagged).length;
      
      const totalHours = userAttendance
        .filter(a => a.totalHours)
        .reduce((sum, a) => sum + (a.totalHours || 0), 0);
      
      const averageHours = presentDays > 0 ? totalHours / presentDays : 0;

      stats.push({
        userId,
        userName: userAttendance[0]?.user?.name || 'Unknown',
        presentDays,
        absentDays,
        lateDays,
        flaggedDays,
        averageHours: Math.round(averageHours * 100) / 100,
      });
    }

    return stats;
  }

  /**
   * Calculate detailed statistics for an individual employee
   */
  private calculateDetailedStats(
    attendance: DailyAttendance[],
    locationLogs: any[],
  ): {
    totalDays: number;
    presentDays: number;
    totalHours: number;
    averageHours: number;
    flaggedDays: number;
    locationVisits: number;
  } {
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.clockInTime).length;
    const totalHours = attendance
      .filter(a => a.totalHours)
      .reduce((sum, a) => sum + (a.totalHours || 0), 0);
    const averageHours = presentDays > 0 ? totalHours / presentDays : 0;
    const flaggedDays = attendance.filter(a => a.isFlagged).length;
    const locationVisits = locationLogs.filter(l => l.checkOutTime).length;

    return {
      totalDays,
      presentDays,
      totalHours: Math.round(totalHours * 100) / 100,
      averageHours: Math.round(averageHours * 100) / 100,
      flaggedDays,
      locationVisits,
    };
  }
}
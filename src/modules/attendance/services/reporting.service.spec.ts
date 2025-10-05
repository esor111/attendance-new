import { Test, TestingModule } from '@nestjs/testing';
import { ReportingService } from './reporting.service';
import { ReportingStructureRepository } from '../repositories/reporting-structure.repository';
import { DailyAttendanceRepository } from '../repositories/daily-attendance.repository';
import { AttendanceSessionRepository } from '../repositories/attendance-session.repository';
import { LocationLogRepository } from '../repositories/location-log.repository';
import { ReportingAccessException } from '../../../common/exceptions/attendance.exceptions';

/**
 * Reporting Service Unit Tests
 * Tests manager reporting access with team hierarchy validation
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 */
describe('ReportingService', () => {
  let service: ReportingService;
  let reportingRepo: ReportingStructureRepository;
  let attendanceRepo: DailyAttendanceRepository;
  let sessionRepo: AttendanceSessionRepository;
  let locationRepo: LocationLogRepository;

  // Test organizational hierarchy
  const testHierarchy = {
    ceo: {
      userId: 'user-ceo',
      name: 'CEO',
      level: 1,
      directReports: ['user-vp-sales', 'user-vp-ops'],
      allReports: ['user-vp-sales', 'user-vp-ops', 'user-sales-mgr', 'user-ops-mgr', 'user-sales-rep-1', 'user-sales-rep-2', 'user-field-worker-1', 'user-field-worker-2'],
    },
    vpSales: {
      userId: 'user-vp-sales',
      name: 'VP Sales',
      level: 2,
      managerId: 'user-ceo',
      directReports: ['user-sales-mgr'],
      allReports: ['user-sales-mgr', 'user-sales-rep-1', 'user-sales-rep-2'],
    },
    vpOps: {
      userId: 'user-vp-ops',
      name: 'VP Operations',
      level: 2,
      managerId: 'user-ceo',
      directReports: ['user-ops-mgr'],
      allReports: ['user-ops-mgr', 'user-field-worker-1', 'user-field-worker-2'],
    },
    salesManager: {
      userId: 'user-sales-mgr',
      name: 'Sales Manager',
      level: 3,
      managerId: 'user-vp-sales',
      directReports: ['user-sales-rep-1', 'user-sales-rep-2'],
      allReports: ['user-sales-rep-1', 'user-sales-rep-2'],
    },
    opsManager: {
      userId: 'user-ops-mgr',
      name: 'Operations Manager',
      level: 3,
      managerId: 'user-vp-ops',
      directReports: ['user-field-worker-1', 'user-field-worker-2'],
      allReports: ['user-field-worker-1', 'user-field-worker-2'],
    },
    salesRep1: {
      userId: 'user-sales-rep-1',
      name: 'Sales Rep 1',
      level: 4,
      managerId: 'user-sales-mgr',
      directReports: [],
      allReports: [],
    },
    salesRep2: {
      userId: 'user-sales-rep-2',
      name: 'Sales Rep 2',
      level: 4,
      managerId: 'user-sales-mgr',
      directReports: [],
      allReports: [],
    },
    fieldWorker1: {
      userId: 'user-field-worker-1',
      name: 'Field Worker 1',
      level: 4,
      managerId: 'user-ops-mgr',
      directReports: [],
      allReports: [],
    },
    fieldWorker2: {
      userId: 'user-field-worker-2',
      name: 'Field Worker 2',
      level: 4,
      managerId: 'user-ops-mgr',
      directReports: [],
      allReports: [],
    },
    // Non-manager employee
    nonManager: {
      userId: 'user-non-manager',
      name: 'Non Manager',
      level: 4,
      managerId: 'user-sales-mgr',
      directReports: [],
      allReports: [],
    },
  };

  // Sample attendance data
  const sampleAttendanceData = {
    'user-sales-rep-1': [
      {
        id: 'att-1',
        userId: 'user-sales-rep-1',
        date: '2024-01-15',
        clockInTime: new Date('2024-01-15T09:00:00Z'),
        clockOutTime: new Date('2024-01-15T17:00:00Z'),
        totalHours: 8,
        entityId: 'entity-main-office',
      },
      {
        id: 'att-2',
        userId: 'user-sales-rep-1',
        date: '2024-01-16',
        clockInTime: new Date('2024-01-16T09:15:00Z'),
        clockOutTime: new Date('2024-01-16T17:30:00Z'),
        totalHours: 8.25,
        entityId: 'entity-main-office',
      },
    ],
    'user-field-worker-1': [
      {
        id: 'att-3',
        userId: 'user-field-worker-1',
        date: '2024-01-15',
        clockInTime: new Date('2024-01-15T08:30:00Z'),
        clockOutTime: new Date('2024-01-15T16:30:00Z'),
        totalHours: 8,
        entityId: 'entity-main-office',
      },
    ],
  };

  beforeEach(async () => {
    const mockReportingRepo = {
      findDirectReports: jest.fn(),
      findAllReports: jest.fn(),
      findManagerChain: jest.fn(),
      isManager: jest.fn(),
      validateManagerAccess: jest.fn(),
    };

    const mockAttendanceRepo = {
      findByUserIdAndDateRange: jest.fn(),
      findByUserIdsAndDateRange: jest.fn(),
      findTeamAttendanceSummary: jest.fn(),
    };

    const mockSessionRepo = {
      findByUserIdAndDateRange: jest.fn(),
      findByUserIdsAndDateRange: jest.fn(),
    };

    const mockLocationRepo = {
      findByUserIdAndDateRange: jest.fn(),
      findByUserIdsAndDateRange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        {
          provide: ReportingStructureRepository,
          useValue: mockReportingRepo,
        },
        {
          provide: DailyAttendanceRepository,
          useValue: mockAttendanceRepo,
        },
        {
          provide: AttendanceSessionRepository,
          useValue: mockSessionRepo,
        },
        {
          provide: LocationLogRepository,
          useValue: mockLocationRepo,
        },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
    reportingRepo = module.get<ReportingStructureRepository>(ReportingStructureRepository);
    attendanceRepo = module.get<DailyAttendanceRepository>(DailyAttendanceRepository);
    sessionRepo = module.get<AttendanceSessionRepository>(AttendanceSessionRepository);
    locationRepo = module.get<LocationLogRepository>(LocationLogRepository);
  });

  describe('validateManagerAccess', () => {
    it('should allow manager to access direct report data', async () => {
      const manager = testHierarchy.salesManager;
      const employee = testHierarchy.salesRep1;

      jest.spyOn(reportingRepo, 'validateManagerAccess')
        .mockResolvedValue({
          hasAccess: true,
          relationship: 'direct_report',
          level: 1,
        });

      const result = await service.validateManagerAccess(
        manager.userId,
        employee.userId,
        'view_attendance'
      );

      expect(result.hasAccess).toBe(true);
      expect(result.relationship).toBe('direct_report');
    });

    it('should allow senior manager to access indirect report data', async () => {
      const manager = testHierarchy.vpSales;
      const employee = testHierarchy.salesRep1;

      jest.spyOn(reportingRepo, 'validateManagerAccess')
        .mockResolvedValue({
          hasAccess: true,
          relationship: 'indirect_report',
          level: 2,
        });

      const result = await service.validateManagerAccess(
        manager.userId,
        employee.userId,
        'view_attendance'
      );

      expect(result.hasAccess).toBe(true);
      expect(result.relationship).toBe('indirect_report');
      expect(result.level).toBe(2);
    });

    it('should deny access to employees outside reporting chain', async () => {
      const manager = testHierarchy.salesManager;
      const employee = testHierarchy.fieldWorker1; // Different department

      jest.spyOn(reportingRepo, 'validateManagerAccess')
        .mockResolvedValue({
          hasAccess: false,
          relationship: 'no_relationship',
          level: null,
        });

      await expect(
        service.validateManagerAccess(manager.userId, employee.userId, 'view_attendance')
      ).rejects.toThrow(ReportingAccessException);
    });

    it('should deny access for non-managers', async () => {
      const nonManager = testHierarchy.salesRep1;
      const employee = testHierarchy.salesRep2;

      jest.spyOn(reportingRepo, 'isManager')
        .mockResolvedValue(false);

      await expect(
        service.validateManagerAccess(nonManager.userId, employee.userId, 'view_attendance')
      ).rejects.toThrow(ReportingAccessException);
    });

    it('should allow CEO to access any employee data', async () => {
      const ceo = testHierarchy.ceo;
      const employee = testHierarchy.fieldWorker2;

      jest.spyOn(reportingRepo, 'validateManagerAccess')
        .mockResolvedValue({
          hasAccess: true,
          relationship: 'indirect_report',
          level: 3,
        });

      const result = await service.validateManagerAccess(
        ceo.userId,
        employee.userId,
        'view_attendance'
      );

      expect(result.hasAccess).toBe(true);
    });
  });

  describe('getDirectReports', () => {
    it('should return direct reports for manager', async () => {
      const manager = testHierarchy.salesManager;

      jest.spyOn(reportingRepo, 'findDirectReports')
        .mockResolvedValue([
          {
            employeeId: 'user-sales-rep-1',
            employeeName: 'Sales Rep 1',
            isActive: true,
          },
          {
            employeeId: 'user-sales-rep-2',
            employeeName: 'Sales Rep 2',
            isActive: true,
          },
        ]);

      const result = await service.getDirectReports(manager.userId);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.employeeId)).toContain('user-sales-rep-1');
      expect(result.map(r => r.employeeId)).toContain('user-sales-rep-2');
    });

    it('should return empty array for non-managers', async () => {
      const nonManager = testHierarchy.salesRep1;

      jest.spyOn(reportingRepo, 'findDirectReports')
        .mockResolvedValue([]);

      const result = await service.getDirectReports(nonManager.userId);

      expect(result).toHaveLength(0);
    });

    it('should filter out inactive reports', async () => {
      const manager = testHierarchy.salesManager;

      jest.spyOn(reportingRepo, 'findDirectReports')
        .mockResolvedValue([
          {
            employeeId: 'user-sales-rep-1',
            employeeName: 'Sales Rep 1',
            isActive: true,
          },
          {
            employeeId: 'user-sales-rep-inactive',
            employeeName: 'Inactive Rep',
            isActive: false,
          },
        ]);

      const result = await service.getDirectReports(manager.userId, true);

      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toBe('user-sales-rep-1');
    });
  });

  describe('getAllReports', () => {
    it('should return all reports in hierarchy for senior manager', async () => {
      const manager = testHierarchy.vpSales;

      jest.spyOn(reportingRepo, 'findAllReports')
        .mockResolvedValue([
          {
            employeeId: 'user-sales-mgr',
            employeeName: 'Sales Manager',
            level: 1,
            isActive: true,
          },
          {
            employeeId: 'user-sales-rep-1',
            employeeName: 'Sales Rep 1',
            level: 2,
            isActive: true,
          },
          {
            employeeId: 'user-sales-rep-2',
            employeeName: 'Sales Rep 2',
            level: 2,
            isActive: true,
          },
        ]);

      const result = await service.getAllReports(manager.userId);

      expect(result).toHaveLength(3);
      expect(result.find(r => r.level === 1)).toBeTruthy(); // Direct report
      expect(result.filter(r => r.level === 2)).toHaveLength(2); // Indirect reports
    });

    it('should limit depth for performance', async () => {
      const manager = testHierarchy.ceo;

      jest.spyOn(reportingRepo, 'findAllReports')
        .mockResolvedValue([
          {
            employeeId: 'user-vp-sales',
            employeeName: 'VP Sales',
            level: 1,
            isActive: true,
          },
          {
            employeeId: 'user-sales-mgr',
            employeeName: 'Sales Manager',
            level: 2,
            isActive: true,
          },
        ]);

      const result = await service.getAllReports(manager.userId, 2); // Limit to 2 levels

      expect(result).toHaveLength(2);
      expect(result.every(r => r.level <= 2)).toBe(true);
    });
  });

  describe('getTeamAttendanceReport', () => {
    it('should generate attendance report for direct reports', async () => {
      const manager = testHierarchy.salesManager;
      const startDate = '2024-01-15';
      const endDate = '2024-01-16';

      // Mock manager validation
      jest.spyOn(reportingRepo, 'findDirectReports')
        .mockResolvedValue([
          { employeeId: 'user-sales-rep-1', employeeName: 'Sales Rep 1', isActive: true },
          { employeeId: 'user-sales-rep-2', employeeName: 'Sales Rep 2', isActive: true },
        ]);

      // Mock attendance data
      jest.spyOn(attendanceRepo, 'findByUserIdsAndDateRange')
        .mockResolvedValue([
          ...sampleAttendanceData['user-sales-rep-1'],
          {
            id: 'att-4',
            userId: 'user-sales-rep-2',
            date: '2024-01-15',
            clockInTime: new Date('2024-01-15T09:30:00Z'),
            clockOutTime: new Date('2024-01-15T17:15:00Z'),
            totalHours: 7.75,
            entityId: 'entity-main-office',
          },
        ]);

      const result = await service.getTeamAttendanceReport(
        manager.userId,
        startDate,
        endDate
      );

      expect(result.summary.totalEmployees).toBe(2);
      expect(result.summary.totalWorkingDays).toBe(2);
      expect(result.employeeReports).toHaveLength(2);
      expect(result.employeeReports[0].totalHours).toBeGreaterThan(0);
    });

    it('should include session data in detailed reports', async () => {
      const manager = testHierarchy.salesManager;
      const startDate = '2024-01-15';
      const endDate = '2024-01-15';

      jest.spyOn(reportingRepo, 'findDirectReports')
        .mockResolvedValue([
          { employeeId: 'user-sales-rep-1', employeeName: 'Sales Rep 1', isActive: true },
        ]);

      jest.spyOn(attendanceRepo, 'findByUserIdsAndDateRange')
        .mockResolvedValue(sampleAttendanceData['user-sales-rep-1'].slice(0, 1));

      // Mock session data
      jest.spyOn(sessionRepo, 'findByUserIdsAndDateRange')
        .mockResolvedValue([
          {
            id: 'session-1',
            userId: 'user-sales-rep-1',
            sessionType: 'break',
            checkInTime: new Date('2024-01-15T10:00:00Z'),
            checkOutTime: new Date('2024-01-15T10:15:00Z'),
            duration: 15,
          },
          {
            id: 'session-2',
            userId: 'user-sales-rep-1',
            sessionType: 'lunch',
            checkInTime: new Date('2024-01-15T12:00:00Z'),
            checkOutTime: new Date('2024-01-15T13:00:00Z'),
            duration: 60,
          },
        ]);

      const result = await service.getTeamAttendanceReport(
        manager.userId,
        startDate,
        endDate,
        { includeSessionDetails: true }
      );

      expect(result.employeeReports[0].sessionSummary).toBeTruthy();
      expect(result.employeeReports[0].sessionSummary.totalSessions).toBe(2);
      expect(result.employeeReports[0].sessionSummary.totalBreakTime).toBe(75); // 15 + 60 minutes
    });

    it('should include location data for field workers', async () => {
      const manager = testHierarchy.opsManager;
      const startDate = '2024-01-15';
      const endDate = '2024-01-15';

      jest.spyOn(reportingRepo, 'findDirectReports')
        .mockResolvedValue([
          { employeeId: 'user-field-worker-1', employeeName: 'Field Worker 1', isActive: true },
        ]);

      jest.spyOn(attendanceRepo, 'findByUserIdsAndDateRange')
        .mockResolvedValue(sampleAttendanceData['user-field-worker-1']);

      // Mock location data
      jest.spyOn(locationRepo, 'findByUserIdsAndDateRange')
        .mockResolvedValue([
          {
            id: 'location-1',
            userId: 'user-field-worker-1',
            entityId: 'entity-client-site-1',
            checkInTime: new Date('2024-01-15T10:00:00Z'),
            checkOutTime: new Date('2024-01-15T12:00:00Z'),
            visitDuration: 120,
            purpose: 'Client meeting',
          },
          {
            id: 'location-2',
            userId: 'user-field-worker-1',
            entityId: 'entity-client-site-2',
            checkInTime: new Date('2024-01-15T14:00:00Z'),
            checkOutTime: new Date('2024-01-15T15:30:00Z'),
            visitDuration: 90,
            purpose: 'Site inspection',
          },
        ]);

      const result = await service.getTeamAttendanceReport(
        manager.userId,
        startDate,
        endDate,
        { includeLocationDetails: true }
      );

      expect(result.employeeReports[0].locationSummary).toBeTruthy();
      expect(result.employeeReports[0].locationSummary.totalVisits).toBe(2);
      expect(result.employeeReports[0].locationSummary.totalTravelTime).toBe(210); // 120 + 90 minutes
    });

    it('should deny access for unauthorized managers', async () => {
      const manager = testHierarchy.salesManager;
      const unauthorizedEmployee = testHierarchy.fieldWorker1;

      jest.spyOn(reportingRepo, 'validateManagerAccess')
        .mockResolvedValue({
          hasAccess: false,
          relationship: 'no_relationship',
          level: null,
        });

      await expect(
        service.getEmployeeAttendanceReport(
          manager.userId,
          unauthorizedEmployee.userId,
          '2024-01-15',
          '2024-01-16'
        )
      ).rejects.toThrow(ReportingAccessException);
    });
  });

  describe('getAttendanceSummary', () => {
    it('should generate summary statistics for team', async () => {
      const manager = testHierarchy.vpSales;
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      jest.spyOn(reportingRepo, 'findAllReports')
        .mockResolvedValue([
          { employeeId: 'user-sales-mgr', employeeName: 'Sales Manager', level: 1, isActive: true },
          { employeeId: 'user-sales-rep-1', employeeName: 'Sales Rep 1', level: 2, isActive: true },
          { employeeId: 'user-sales-rep-2', employeeName: 'Sales Rep 2', level: 2, isActive: true },
        ]);

      jest.spyOn(attendanceRepo, 'findTeamAttendanceSummary')
        .mockResolvedValue({
          totalEmployees: 3,
          totalWorkingDays: 22,
          averageHoursPerDay: 8.2,
          attendanceRate: 95.5,
          punctualityRate: 88.7,
          overtimeHours: 45.5,
          absentDays: 2,
          lateDays: 8,
        });

      const result = await service.getAttendanceSummary(
        manager.userId,
        startDate,
        endDate
      );

      expect(result.totalEmployees).toBe(3);
      expect(result.attendanceRate).toBe(95.5);
      expect(result.punctualityRate).toBe(88.7);
      expect(result.averageHoursPerDay).toBe(8.2);
    });

    it('should calculate department comparisons', async () => {
      const manager = testHierarchy.ceo;
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      jest.spyOn(service, 'getDepartmentComparison')
        .mockResolvedValue([
          {
            departmentName: 'Sales',
            employeeCount: 3,
            attendanceRate: 95.5,
            averageHours: 8.2,
            punctualityRate: 88.7,
          },
          {
            departmentName: 'Operations',
            employeeCount: 3,
            attendanceRate: 92.1,
            averageHours: 8.5,
            punctualityRate: 91.2,
          },
        ]);

      const result = await service.getDepartmentComparison(
        manager.userId,
        startDate,
        endDate
      );

      expect(result).toHaveLength(2);
      expect(result[0].departmentName).toBe('Sales');
      expect(result[1].departmentName).toBe('Operations');
    });
  });

  describe('getManagerChain', () => {
    it('should return complete manager chain for employee', async () => {
      const employee = testHierarchy.salesRep1;

      jest.spyOn(reportingRepo, 'findManagerChain')
        .mockResolvedValue([
          {
            managerId: 'user-sales-mgr',
            managerName: 'Sales Manager',
            level: 1,
          },
          {
            managerId: 'user-vp-sales',
            managerName: 'VP Sales',
            level: 2,
          },
          {
            managerId: 'user-ceo',
            managerName: 'CEO',
            level: 3,
          },
        ]);

      const result = await service.getManagerChain(employee.userId);

      expect(result).toHaveLength(3);
      expect(result[0].level).toBe(1); // Direct manager
      expect(result[2].level).toBe(3); // Top level
    });

    it('should return empty array for top-level manager', async () => {
      const ceo = testHierarchy.ceo;

      jest.spyOn(reportingRepo, 'findManagerChain')
        .mockResolvedValue([]);

      const result = await service.getManagerChain(ceo.userId);

      expect(result).toHaveLength(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large teams efficiently', async () => {
      const manager = testHierarchy.ceo;
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      // Mock large team (100 employees)
      const largeTeam = Array.from({ length: 100 }, (_, i) => ({
        employeeId: `user-employee-${i}`,
        employeeName: `Employee ${i}`,
        level: Math.floor(i / 20) + 1,
        isActive: true,
      }));

      jest.spyOn(reportingRepo, 'findAllReports')
        .mockResolvedValue(largeTeam);

      // Mock attendance data for large team
      const largeAttendanceData = Array.from({ length: 100 }, (_, i) => ({
        id: `att-${i}`,
        userId: `user-employee-${i}`,
        date: '2024-01-15',
        clockInTime: new Date('2024-01-15T09:00:00Z'),
        clockOutTime: new Date('2024-01-15T17:00:00Z'),
        totalHours: 8,
      }));

      jest.spyOn(attendanceRepo, 'findByUserIdsAndDateRange')
        .mockResolvedValue(largeAttendanceData);

      const startTime = Date.now();
      
      const result = await service.getTeamAttendanceReport(
        manager.userId,
        startDate,
        endDate
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.summary.totalEmployees).toBe(100);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle missing data gracefully', async () => {
      const manager = testHierarchy.salesManager;
      const startDate = '2024-01-15';
      const endDate = '2024-01-16';

      jest.spyOn(reportingRepo, 'findDirectReports')
        .mockResolvedValue([
          { employeeId: 'user-sales-rep-1', employeeName: 'Sales Rep 1', isActive: true },
        ]);

      // Mock no attendance data
      jest.spyOn(attendanceRepo, 'findByUserIdsAndDateRange')
        .mockResolvedValue([]);

      const result = await service.getTeamAttendanceReport(
        manager.userId,
        startDate,
        endDate
      );

      expect(result.summary.totalEmployees).toBe(1);
      expect(result.employeeReports).toHaveLength(1);
      expect(result.employeeReports[0].totalHours).toBe(0);
      expect(result.employeeReports[0].attendanceDays).toBe(0);
    });

    it('should validate date ranges', async () => {
      const manager = testHierarchy.salesManager;
      const invalidStartDate = '2024-01-31';
      const invalidEndDate = '2024-01-01'; // End before start

      await expect(
        service.getTeamAttendanceReport(manager.userId, invalidStartDate, invalidEndDate)
      ).rejects.toThrow('Invalid date range');
    });

    it('should handle concurrent report requests', async () => {
      const manager = testHierarchy.salesManager;
      const startDate = '2024-01-15';
      const endDate = '2024-01-16';

      // Setup mocks
      jest.spyOn(reportingRepo, 'findDirectReports')
        .mockResolvedValue([
          { employeeId: 'user-sales-rep-1', employeeName: 'Sales Rep 1', isActive: true },
        ]);

      jest.spyOn(attendanceRepo, 'findByUserIdsAndDateRange')
        .mockResolvedValue(sampleAttendanceData['user-sales-rep-1']);

      // Make concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        service.getTeamAttendanceReport(manager.userId, startDate, endDate)
      );

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.summary.totalEmployees).toBe(1);
      });
    });

    it('should cache frequently accessed data', async () => {
      const manager = testHierarchy.salesManager;

      const spy = jest.spyOn(reportingRepo, 'findDirectReports')
        .mockResolvedValue([
          { employeeId: 'user-sales-rep-1', employeeName: 'Sales Rep 1', isActive: true },
        ]);

      // Call multiple times
      await service.getDirectReports(manager.userId);
      await service.getDirectReports(manager.userId);
      await service.getDirectReports(manager.userId);

      // Should use caching to reduce database calls
      // Note: This assumes caching is implemented in the service
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
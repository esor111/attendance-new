import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { RequestService } from './request.service';
import { RequestRepository } from '../repositories/request.repository';
import { DailyAttendanceRepository } from '../repositories/daily-attendance.repository';
import { ReportingStructureRepository } from '../repositories/reporting-structure.repository';
import { RequestType, RequestStatus } from '../entities/request.entity';

describe('RequestService', () => {
  let service: RequestService;
  let requestRepository: jest.Mocked<RequestRepository>;
  let dailyAttendanceRepository: jest.Mocked<DailyAttendanceRepository>;
  let reportingStructureRepository: jest.Mocked<ReportingStructureRepository>;

  const mockRequestRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findPendingForManager: jest.fn(),
    findTeamRequests: jest.fn(),
    update: jest.fn(),
    hasRequestForDate: jest.fn(),
    findOverlappingLeaveRequests: jest.fn(),
    findByUserAndDateRange: jest.fn(),
    getRequestStats: jest.fn(),
  };

  const mockDailyAttendanceRepository = {
    findByUserIdAndDate: jest.fn(),
    create: jest.fn(),
  };

  const mockReportingStructureRepository = {
    existsRelationship: jest.fn(),
    getReportingChain: jest.fn(),
    findCurrentManagerByEmployeeId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestService,
        {
          provide: RequestRepository,
          useValue: mockRequestRepository,
        },
        {
          provide: DailyAttendanceRepository,
          useValue: mockDailyAttendanceRepository,
        },
        {
          provide: ReportingStructureRepository,
          useValue: mockReportingStructureRepository,
        },
      ],
    }).compile();

    service = module.get<RequestService>(RequestService);
    requestRepository = module.get(RequestRepository);
    dailyAttendanceRepository = module.get(DailyAttendanceRepository);
    reportingStructureRepository = module.get(ReportingStructureRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRequest', () => {
    it('should create a leave request successfully', async () => {
      const userId = 'user-123';
      const leaveRequestData = {
        leaveType: 'ANNUAL' as const,
        startDate: '2025-10-15',
        endDate: '2025-10-17',
        daysRequested: 3,
        reason: 'Family vacation',
        balanceInfo: {
          allocatedDays: 25,
          usedDays: 5,
          remainingDays: 20,
        },
      };

      const mockRequest = {
        id: 'request-123',
        userId,
        type: RequestType.LEAVE,
        requestData: leaveRequestData,
        status: RequestStatus.PENDING,
        requiresApproval: () => true,
      };

      mockRequestRepository.findOverlappingLeaveRequests.mockResolvedValue([]);
      mockRequestRepository.create.mockResolvedValue(mockRequest as any);
      mockReportingStructureRepository.findCurrentManagerByEmployeeId.mockResolvedValue({
        managerId: 'manager-123',
      });

      const result = await service.createRequest(userId, RequestType.LEAVE, leaveRequestData);

      expect(result).toEqual(mockRequest);
      expect(mockRequestRepository.create).toHaveBeenCalledWith({
        userId,
        type: RequestType.LEAVE,
        requestData: leaveRequestData,
        status: RequestStatus.PENDING,
        notes: undefined,
      });
    });

    it('should create a remote work request successfully', async () => {
      const userId = 'user-123';
      const remoteWorkRequestData = {
        requestedDate: '2025-10-20',
        reason: 'Home office setup',
        remoteLocation: 'Home',
        notes: 'Better productivity',
      };

      const mockRequest = {
        id: 'request-123',
        userId,
        type: RequestType.REMOTE_WORK,
        requestData: remoteWorkRequestData,
        status: RequestStatus.PENDING,
        requiresApproval: () => true,
      };

      // Mock validation checks
      mockRequestRepository.hasRequestForDate.mockResolvedValue(false);
      mockRequestRepository.findByUserAndDateRange.mockResolvedValue([]);
      mockRequestRepository.create.mockResolvedValue(mockRequest as any);
      mockReportingStructureRepository.findCurrentManagerByEmployeeId.mockResolvedValue({
        managerId: 'manager-123',
      });

      const result = await service.createRequest(userId, RequestType.REMOTE_WORK, remoteWorkRequestData);

      expect(result).toEqual(mockRequest);
      expect(mockRequestRepository.hasRequestForDate).toHaveBeenCalledWith(
        userId,
        RequestType.REMOTE_WORK,
        new Date('2025-10-20'),
      );
    });

    it('should create an attendance correction request successfully', async () => {
      const userId = 'user-123';
      const attendanceRequestData = {
        requestedDate: '2025-10-10',
        reason: 'Forgot to clock in',
      };

      const mockRequest = {
        id: 'request-123',
        userId,
        type: RequestType.ATTENDANCE_CORRECTION,
        requestData: attendanceRequestData,
        status: RequestStatus.PENDING,
        requiresApproval: () => true,
      };

      // Mock validation checks
      mockDailyAttendanceRepository.findByUserIdAndDate.mockResolvedValue(null);
      mockRequestRepository.hasRequestForDate.mockResolvedValue(false);
      mockRequestRepository.create.mockResolvedValue(mockRequest as any);
      mockReportingStructureRepository.findCurrentManagerByEmployeeId.mockResolvedValue({
        managerId: 'manager-123',
      });

      const result = await service.createRequest(userId, RequestType.ATTENDANCE_CORRECTION, attendanceRequestData);

      expect(result).toEqual(mockRequest);
      expect(mockDailyAttendanceRepository.findByUserIdAndDate).toHaveBeenCalledWith(
        userId,
        new Date('2025-10-10'),
      );
    });

    it('should throw ConflictException for overlapping leave requests', async () => {
      const userId = 'user-123';
      const leaveRequestData = {
        leaveType: 'ANNUAL' as const,
        startDate: '2025-10-15',
        endDate: '2025-10-17',
        daysRequested: 3,
        reason: 'Family vacation',
        balanceInfo: {
          allocatedDays: 25,
          usedDays: 5,
          remainingDays: 20,
        },
      };

      // Mock overlapping request exists
      mockRequestRepository.findOverlappingLeaveRequests.mockResolvedValue([
        { id: 'existing-request' } as any,
      ]);

      await expect(
        service.createRequest(userId, RequestType.LEAVE, leaveRequestData)
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for insufficient leave balance', async () => {
      const userId = 'user-123';
      const leaveRequestData = {
        leaveType: 'ANNUAL' as const,
        startDate: '2025-10-15',
        endDate: '2025-10-17',
        daysRequested: 25, // More than remaining balance
        reason: 'Family vacation',
        balanceInfo: {
          allocatedDays: 25,
          usedDays: 5,
          remainingDays: 20, // Only 20 remaining
        },
      };

      mockRequestRepository.findOverlappingLeaveRequests.mockResolvedValue([]);

      await expect(
        service.createRequest(userId, RequestType.LEAVE, leaveRequestData)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for remote work request without 24h advance notice', async () => {
      const userId = 'user-123';
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(tomorrow.getHours() - 1); // Less than 24 hours

      const remoteWorkRequestData = {
        requestedDate: tomorrow.toISOString().split('T')[0],
        reason: 'Home office setup',
        remoteLocation: 'Home',
      };

      await expect(
        service.createRequest(userId, RequestType.REMOTE_WORK, remoteWorkRequestData)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveRequest', () => {
    it('should approve a request successfully', async () => {
      const requestId = 'request-123';
      const approverId = 'manager-123';
      const mockRequest = {
        id: requestId,
        userId: 'user-123',
        type: RequestType.LEAVE,
        status: RequestStatus.PENDING,
        requestData: {
          leaveType: 'ANNUAL',
          daysRequested: 3,
          balanceInfo: {
            allocatedDays: 25,
            usedDays: 5,
            remainingDays: 20,
          },
        },
      };

      const updatedRequest = {
        ...mockRequest,
        status: RequestStatus.APPROVED,
        approverId,
        approvedAt: new Date(),
      };

      mockRequestRepository.findById.mockResolvedValue(mockRequest as any);
      mockReportingStructureRepository.existsRelationship.mockResolvedValue(true);
      mockRequestRepository.update.mockResolvedValue(updatedRequest as any);

      const result = await service.approveRequest(requestId, approverId, {
        status: RequestStatus.APPROVED,
        notes: 'Approved for vacation',
      });

      expect(result).toEqual(updatedRequest);
      expect(mockRequestRepository.update).toHaveBeenCalledWith(requestId, expect.objectContaining({
        status: RequestStatus.APPROVED,
        approverId,
        approvalNotes: 'Approved for vacation',
      }));
    });

    it('should throw NotFoundException for non-existent request', async () => {
      const requestId = 'non-existent';
      const approverId = 'manager-123';

      mockRequestRepository.findById.mockResolvedValue(null);

      await expect(
        service.approveRequest(requestId, approverId, {
          status: RequestStatus.APPROVED,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already processed request', async () => {
      const requestId = 'request-123';
      const approverId = 'manager-123';
      const mockRequest = {
        id: requestId,
        status: RequestStatus.APPROVED, // Already processed
      };

      mockRequestRepository.findById.mockResolvedValue(mockRequest as any);

      await expect(
        service.approveRequest(requestId, approverId, {
          status: RequestStatus.APPROVED,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for unauthorized approver', async () => {
      const requestId = 'request-123';
      const approverId = 'unauthorized-manager';
      const mockRequest = {
        id: requestId,
        userId: 'user-123',
        status: RequestStatus.PENDING,
      };

      mockRequestRepository.findById.mockResolvedValue(mockRequest as any);
      mockReportingStructureRepository.existsRelationship.mockResolvedValue(false);
      mockReportingStructureRepository.getReportingChain.mockResolvedValue([]);

      await expect(
        service.approveRequest(requestId, approverId, {
          status: RequestStatus.APPROVED,
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserRequests', () => {
    it('should return user requests with filters', async () => {
      const userId = 'user-123';
      const mockRequests = [
        {
          id: 'request-1',
          type: RequestType.LEAVE,
          status: RequestStatus.APPROVED,
        },
        {
          id: 'request-2',
          type: RequestType.REMOTE_WORK,
          status: RequestStatus.PENDING,
        },
      ];

      mockRequestRepository.findByUserId.mockResolvedValue(mockRequests as any);

      const result = await service.getUserRequests(
        userId,
        RequestType.LEAVE,
        RequestStatus.APPROVED,
        new Date('2025-10-01'),
        new Date('2025-10-31'),
        10,
      );

      expect(result).toEqual(mockRequests);
      expect(mockRequestRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        RequestType.LEAVE,
        RequestStatus.APPROVED,
        new Date('2025-10-01'),
        new Date('2025-10-31'),
        10,
      );
    });
  });

  describe('getRequestStatistics', () => {
    it('should return request statistics', async () => {
      const mockStats = {
        total: 100,
        pending: 20,
        approved: 70,
        rejected: 10,
        cancelled: 0,
      };

      mockRequestRepository.getRequestStats.mockResolvedValue(mockStats);

      const result = await service.getRequestStatistics(
        new Date('2025-10-01'),
        new Date('2025-10-31'),
        'manager-123',
        RequestType.LEAVE,
      );

      expect(result).toEqual({
        ...mockStats,
        approvalRate: 88, // 70 / (70 + 10) * 100 = 87.5, rounded to 88
      });
    });
  });
});
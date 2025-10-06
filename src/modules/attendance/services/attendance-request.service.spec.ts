import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AttendanceRequestService } from './attendance-request.service';
import { AttendanceRequestRepository } from '../repositories/attendance-request.repository';
import { DailyAttendanceRepository } from '../repositories/daily-attendance.repository';
import { ReportingStructureRepository } from '../repositories/reporting-structure.repository';
import { AttendanceRequest } from '../entities/attendance-request.entity';
import { DailyAttendance } from '../entities/daily-attendance.entity';

describe('AttendanceRequestService', () => {
  let service: AttendanceRequestService;
  let attendanceRequestRepository: jest.Mocked<AttendanceRequestRepository>;
  let dailyAttendanceRepository: jest.Mocked<DailyAttendanceRepository>;
  let reportingStructureRepository: jest.Mocked<ReportingStructureRepository>;

  const mockUserId = 'user-123';
  const mockManagerId = 'manager-456';
  const mockRequestId = 'request-789';

  beforeEach(async () => {
    const mockAttendanceRequestRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findPendingForManager: jest.fn(),
      hasRequestForDate: jest.fn(),
      update: jest.fn(),
      getRequestStats: jest.fn(),
      findOverdueRequests: jest.fn(),
      delete: jest.fn(),
    };

    const mockDailyAttendanceRepository = {
      findByUserIdAndDate: jest.fn(),
      create: jest.fn(),
    };

    const mockReportingStructureRepository = {
      existsRelationship: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceRequestService,
        {
          provide: AttendanceRequestRepository,
          useValue: mockAttendanceRequestRepository,
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

    service = module.get<AttendanceRequestService>(AttendanceRequestService);
    attendanceRequestRepository = module.get(AttendanceRequestRepository);
    dailyAttendanceRepository = module.get(DailyAttendanceRepository);
    reportingStructureRepository = module.get(ReportingStructureRepository);
  });

  describe('createRequest', () => {
    const createRequestDto = {
      requestedDate: '2025-10-01',
      reason: 'Forgot to clock in due to emergency',
    };

    it('should create attendance request successfully', async () => {
      const expectedRequest = {
        id: mockRequestId,
        userId: mockUserId,
        requestedDate: new Date('2025-10-01'),
        reason: createRequestDto.reason,
        status: 'PENDING',
      } as AttendanceRequest;

      dailyAttendanceRepository.findByUserIdAndDate.mockResolvedValue(null);
      attendanceRequestRepository.hasRequestForDate.mockResolvedValue(false);
      attendanceRequestRepository.create.mockResolvedValue(expectedRequest);

      const result = await service.createRequest(mockUserId, createRequestDto);

      expect(result).toEqual(expectedRequest);
      expect(attendanceRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          requestedDate: new Date('2025-10-01'),
          reason: createRequestDto.reason,
          status: 'PENDING',
        })
      );
    });

    it('should throw BadRequestException for future dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateDto = {
        ...createRequestDto,
        requestedDate: futureDate.toISOString().split('T')[0],
      };

      await expect(service.createRequest(mockUserId, futureDateDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if attendance already exists', async () => {
      const existingAttendance = { id: 'existing-123' } as DailyAttendance;
      dailyAttendanceRepository.findByUserIdAndDate.mockResolvedValue(existingAttendance);

      await expect(service.createRequest(mockUserId, createRequestDto))
        .rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if request already exists', async () => {
      dailyAttendanceRepository.findByUserIdAndDate.mockResolvedValue(null);
      attendanceRequestRepository.hasRequestForDate.mockResolvedValue(true);

      await expect(service.createRequest(mockUserId, createRequestDto))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('approveRequest', () => {
    const approveDto = {
      action: 'APPROVE' as const,
      notes: 'Approved due to valid emergency',
    };

    it('should approve request and create attendance record', async () => {
      const mockRequest = {
        id: mockRequestId,
        userId: mockUserId,
        requestedDate: new Date('2025-10-01'),
        status: 'PENDING',
        requestDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      } as AttendanceRequest;

      const mockCreatedAttendance = {
        id: 'attendance-123',
        userId: mockUserId,
        date: new Date('2025-10-01'),
      } as DailyAttendance;

      const mockUpdatedRequest = {
        ...mockRequest,
        status: 'APPROVED',
        approverId: mockManagerId,
        createdAttendanceId: mockCreatedAttendance.id,
      } as AttendanceRequest;

      attendanceRequestRepository.findById.mockResolvedValue(mockRequest);
      reportingStructureRepository.existsRelationship.mockResolvedValue(true);
      dailyAttendanceRepository.findByUserIdAndDate.mockResolvedValue(null);
      dailyAttendanceRepository.create.mockResolvedValue(mockCreatedAttendance);
      attendanceRequestRepository.update.mockResolvedValue(mockUpdatedRequest);

      const result = await service.approveRequest(mockRequestId, mockManagerId, approveDto);

      expect(result.status).toBe('APPROVED');
      expect(result.approverId).toBe(mockManagerId);
      expect(result.createdAttendanceId).toBe(mockCreatedAttendance.id);
    });

    it('should throw NotFoundException if request not found', async () => {
      attendanceRequestRepository.findById.mockResolvedValue(null);

      await expect(service.approveRequest(mockRequestId, mockManagerId, approveDto))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if request already processed', async () => {
      const processedRequest = {
        id: mockRequestId,
        status: 'APPROVED',
      } as AttendanceRequest;

      attendanceRequestRepository.findById.mockResolvedValue(processedRequest);

      await expect(service.approveRequest(mockRequestId, mockManagerId, approveDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no permission to approve', async () => {
      const mockRequest = {
        id: mockRequestId,
        userId: mockUserId,
        status: 'PENDING',
      } as AttendanceRequest;

      attendanceRequestRepository.findById.mockResolvedValue(mockRequest);
      reportingStructureRepository.existsRelationship.mockResolvedValue(false);

      await expect(service.approveRequest(mockRequestId, mockManagerId, approveDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('canCreateRequest', () => {
    it('should return true if request can be created', async () => {
      const requestDate = new Date('2025-10-01');
      
      dailyAttendanceRepository.findByUserIdAndDate.mockResolvedValue(null);
      attendanceRequestRepository.hasRequestForDate.mockResolvedValue(false);

      const result = await service.canCreateRequest(mockUserId, requestDate);

      expect(result.canCreate).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return false for future dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const result = await service.canCreateRequest(mockUserId, futureDate);

      expect(result.canCreate).toBe(false);
      expect(result.reason).toBe('Cannot request attendance for future dates');
    });

    it('should return false if attendance exists', async () => {
      const requestDate = new Date('2025-10-01');
      const existingAttendance = { id: 'existing-123' } as DailyAttendance;
      
      dailyAttendanceRepository.findByUserIdAndDate.mockResolvedValue(existingAttendance);

      const result = await service.canCreateRequest(mockUserId, requestDate);

      expect(result.canCreate).toBe(false);
      expect(result.reason).toBe('Attendance record already exists for this date');
    });
  });

  describe('getRequestStatistics', () => {
    it('should return request statistics with approval rate', async () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');
      const mockStats = {
        total: 10,
        pending: 2,
        approved: 6,
        rejected: 2,
      };

      attendanceRequestRepository.getRequestStats.mockResolvedValue(mockStats);

      const result = await service.getRequestStatistics(startDate, endDate, mockManagerId);

      expect(result).toEqual({
        ...mockStats,
        approvalRate: 75, // 6/(6+2) * 100
      });
    });

    it('should handle zero approval rate', async () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');
      const mockStats = {
        total: 5,
        pending: 5,
        approved: 0,
        rejected: 0,
      };

      attendanceRequestRepository.getRequestStats.mockResolvedValue(mockStats);

      const result = await service.getRequestStatistics(startDate, endDate, mockManagerId);

      expect(result.approvalRate).toBe(0);
    });
  });
});
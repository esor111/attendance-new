import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LeaveService } from './leave.service';
import { LeaveRequest, LeaveType, LeaveRequestStatus } from '../entities/leave-request.entity';
import { ReportingStructureRepository } from '../../attendance/repositories/reporting-structure.repository';

describe('LeaveService', () => {
  let service: LeaveService;
  let leaveRequestRepository: jest.Mocked<Repository<LeaveRequest>>;
  let reportingStructureRepository: jest.Mocked<ReportingStructureRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveService,
        {
          provide: getRepositoryToken(LeaveRequest),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: ReportingStructureRepository,
          useValue: {
            findCurrentTeamByManagerId: jest.fn(),
            findCurrentManagerByEmployeeId: jest.fn(),
            existsRelationship: jest.fn(),
            getReportingChain: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LeaveService>(LeaveService);
    leaveRequestRepository = module.get(getRepositoryToken(LeaveRequest));
    reportingStructureRepository = module.get(ReportingStructureRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLeaveRequest', () => {
    it('should create a leave request with embedded balance info', async () => {
      const userId = 'user-123';
      const createDto = {
        leaveType: LeaveType.ANNUAL,
        startDate: '2025-12-01',
        endDate: '2025-12-03',
        daysRequested: 3,
        reason: 'Family vacation',
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // No overlapping requests
      };

      leaveRequestRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const mockLeaveRequest = {
        id: 'leave-123',
        userId,
        leaveType: LeaveType.ANNUAL,
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-03'),
        daysRequested: 3,
        reason: 'Family vacation',
        status: LeaveRequestStatus.PENDING,
        balanceInfo: {
          allocatedDays: 25,
          usedDays: 0,
          remainingDays: 22, // 25 - 3 requested
        },
      };

      leaveRequestRepository.create.mockReturnValue(mockLeaveRequest as any);
      leaveRequestRepository.save.mockResolvedValue(mockLeaveRequest as any);

      const result = await service.createLeaveRequest(userId, createDto);

      expect(result).toBeDefined();
      expect(result.leaveType).toBe(LeaveType.ANNUAL);
      expect(result.balanceInfo.remainingDays).toBe(22);
      expect(leaveRequestRepository.save).toHaveBeenCalled();
    });

    it('should reject request with insufficient balance', async () => {
      const userId = 'user-123';
      const createDto = {
        leaveType: LeaveType.ANNUAL,
        startDate: '2025-12-01',
        endDate: '2025-12-10',
        daysRequested: 30, // More than allocated
        reason: 'Long vacation',
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // No overlapping requests
      };

      leaveRequestRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await expect(service.createLeaveRequest(userId, createDto))
        .rejects
        .toThrow('Insufficient leave balance');
    });
  });

  describe('getUserLeaveBalances', () => {
    it('should return balances for all leave types', async () => {
      const userId = 'user-123';
      const year = 2025;

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // No existing requests
      };

      leaveRequestRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUserLeaveBalances(userId, year);

      expect(result).toHaveLength(4); // ANNUAL, SICK, PERSONAL, EMERGENCY
      expect(result[0].leaveType.name).toBe('Annual Leave');
      expect(result[0].allocatedDays).toBe(25);
    });
  });

  describe('canRequestLeave', () => {
    it('should return true for valid leave request', async () => {
      const userId = 'user-123';
      const startDate = new Date('2025-12-01');
      const endDate = new Date('2025-12-03');

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // No overlapping requests
      };

      leaveRequestRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.canRequestLeave(
        userId,
        LeaveType.ANNUAL,
        startDate,
        endDate,
        3
      );

      expect(result.canRequest).toBe(true);
    });

    it('should return false for insufficient advance notice', async () => {
      const userId = 'user-123';
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // No overlapping requests
      };

      leaveRequestRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.canRequestLeave(
        userId,
        LeaveType.ANNUAL, // Requires 7 days advance notice
        tomorrow,
        dayAfter,
        2
      );

      expect(result.canRequest).toBe(false);
      expect(result.reason).toContain('7 days advance notice');
    });
  });
});
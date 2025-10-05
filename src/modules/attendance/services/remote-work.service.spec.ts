import { Test, TestingModule } from '@nestjs/testing';
import { RemoteWorkService } from './remote-work.service';
import { RemoteWorkRequestRepository } from '../repositories/remote-work-request.repository';
import { ReportingStructureRepository } from '../repositories/reporting-structure.repository';

describe('RemoteWorkService', () => {
  let service: RemoteWorkService;
  let mockRemoteWorkRepository: Partial<RemoteWorkRequestRepository>;
  let mockReportingStructureRepository: Partial<ReportingStructureRepository>;

  beforeEach(async () => {
    mockRemoteWorkRepository = {
      findByUserIdAndDate: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      findByUserIdAndDateRange: jest.fn(),
      hasApprovedRequestForDate: jest.fn(),
    };

    mockReportingStructureRepository = {
      existsRelationship: jest.fn(),
      getTeamMemberIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoteWorkService,
        {
          provide: RemoteWorkRequestRepository,
          useValue: mockRemoteWorkRepository,
        },
        {
          provide: ReportingStructureRepository,
          useValue: mockReportingStructureRepository,
        },
      ],
    }).compile();

    service = module.get<RemoteWorkService>(RemoteWorkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRequest', () => {
    it('should create a remote work request successfully', async () => {
      const userId = 'user-123';
      const dto = {
        requestedDate: '2025-10-07', // Future date
        reason: 'Working from home',
        remoteLocation: 'Home office',
        notes: 'Need to focus on project',
      };

      mockRemoteWorkRepository.findByUserIdAndDate = jest.fn().mockResolvedValue(null);
      mockRemoteWorkRepository.findByUserIdAndDateRange = jest.fn().mockResolvedValue([]);
      mockRemoteWorkRepository.create = jest.fn().mockResolvedValue({
        id: 'request-123',
        userId,
        ...dto,
        status: 'PENDING',
      });

      const result = await service.createRequest(userId, dto);

      expect(result).toBeDefined();
      expect(mockRemoteWorkRepository.create).toHaveBeenCalled();
    });

    it('should throw error for past date requests', async () => {
      const userId = 'user-123';
      const dto = {
        requestedDate: '2025-10-04', // Past date
        reason: 'Working from home',
        remoteLocation: 'Home office',
      };

      await expect(service.createRequest(userId, dto)).rejects.toThrow(
        'Remote work requests must be submitted at least 24 hours in advance'
      );
    });
  });

  describe('hasApprovedRemoteWork', () => {
    it('should return true for approved remote work', async () => {
      const userId = 'user-123';
      const date = new Date('2025-10-07');

      mockRemoteWorkRepository.hasApprovedRequestForDate = jest.fn().mockResolvedValue(true);

      const result = await service.hasApprovedRemoteWork(userId, date);

      expect(result).toBe(true);
      expect(mockRemoteWorkRepository.hasApprovedRequestForDate).toHaveBeenCalledWith(userId, date);
    });
  });
});
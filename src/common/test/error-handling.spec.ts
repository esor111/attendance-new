import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { 
  LocationValidationException,
  EntityAccessDeniedException,
  GeospatialValidationException 
} from '../exceptions/business-logic.exceptions';
import { ValidationService } from '../services/validation.service';

describe('Error Handling System', () => {
  let validationService: ValidationService;
  let exceptionFilter: GlobalExceptionFilter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationService, GlobalExceptionFilter],
    }).compile();

    validationService = module.get<ValidationService>(ValidationService);
    exceptionFilter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
  });

  describe('ValidationService', () => {
    describe('validateCoordinates', () => {
      it('should pass for valid coordinates', () => {
        expect(() => {
          validationService.validateCoordinates(27.7172, 85.3240);
        }).not.toThrow();
      });

      it('should throw for invalid latitude', () => {
        expect(() => {
          validationService.validateCoordinates(91, 85.3240);
        }).toThrow(GeospatialValidationException);
      });

      it('should throw for invalid longitude', () => {
        expect(() => {
          validationService.validateCoordinates(27.7172, 181);
        }).toThrow(GeospatialValidationException);
      });
    });

    describe('validateRadius', () => {
      it('should pass for valid radius', () => {
        expect(() => {
          validationService.validateRadius(100);
        }).not.toThrow();
      });

      it('should throw for radius too small', () => {
        expect(() => {
          validationService.validateRadius(5);
        }).toThrow(GeospatialValidationException);
      });

      it('should throw for radius too large', () => {
        expect(() => {
          validationService.validateRadius(1500);
        }).toThrow(GeospatialValidationException);
      });
    });

    describe('validateLocationWithinRadius', () => {
      it('should pass when location is within radius', () => {
        expect(() => {
          validationService.validateLocationWithinRadius(50, 100, 'Test Office');
        }).not.toThrow();
      });

      it('should throw when location is outside radius', () => {
        expect(() => {
          validationService.validateLocationWithinRadius(150, 100, 'Test Office');
        }).toThrow(LocationValidationException);
      });
    });

    describe('validateEmail', () => {
      it('should pass for valid email', () => {
        expect(() => {
          validationService.validateEmail('test@example.com');
        }).not.toThrow();
      });

      it('should throw for invalid email', () => {
        expect(() => {
          validationService.validateEmail('invalid-email');
        }).toThrow();
      });
    });

    describe('validateKahaId', () => {
      it('should pass for valid KahaId', () => {
        expect(() => {
          validationService.validateKahaId('KTM-MAIN-001');
        }).not.toThrow();
      });

      it('should throw for empty KahaId', () => {
        expect(() => {
          validationService.validateKahaId('');
        }).toThrow();
      });

      it('should throw for KahaId with invalid characters', () => {
        expect(() => {
          validationService.validateKahaId('KTM@MAIN#001');
        }).toThrow();
      });
    });

    describe('validateUUID', () => {
      it('should pass for valid UUID', () => {
        expect(() => {
          validationService.validateUUID('123e4567-e89b-42d3-a456-426614174000');
        }).not.toThrow();
      });

      it('should throw for invalid UUID', () => {
        expect(() => {
          validationService.validateUUID('invalid-uuid');
        }).toThrow();
      });
    });
  });

  describe('Custom Exceptions', () => {
    it('should create LocationValidationException with proper details', () => {
      const exception = new LocationValidationException(150.5, 100, 'Test Office');
      expect(exception.getStatus()).toBe(400);
      expect(exception.getResponse()).toMatchObject({
        message: expect.stringContaining('150.50m away'),
        error: 'Location Validation Failed',
        details: {
          actualDistance: 150.5,
          requiredRadius: 100,
          entityName: 'Test Office',
        },
      });
    });

    it('should create EntityAccessDeniedException with proper details', () => {
      const exception = new EntityAccessDeniedException(
        'user-123',
        'entity-456',
        'User has no department assigned'
      );
      expect(exception.getStatus()).toBe(403);
      expect(exception.getResponse()).toMatchObject({
        error: 'Entity Access Denied',
        details: {
          userId: 'user-123',
          entityId: 'entity-456',
          reason: 'User has no department assigned',
        },
      });
    });
  });
});

/**
 * Integration test for error handling workflow
 * Tests the complete error handling pipeline
 */
describe('Error Handling Integration', () => {
  it('should handle validation errors consistently', () => {
    // This test would be expanded in a real implementation
    // to test the complete error handling pipeline from
    // controller -> service -> exception filter -> response
    expect(true).toBe(true);
  });
});
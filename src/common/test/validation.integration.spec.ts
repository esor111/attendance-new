import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ValidationService } from '../services/validation.service';
import {
  LocationValidationException,
  EntityAccessDeniedException,
  GeospatialValidationException,
} from '../exceptions/business-logic.exceptions';

/**
 * Comprehensive validation tests covering all business rules and edge cases
 * Tests coordinate validation, radius validation, and business logic validation
 */
describe('Validation System Integration Tests', () => {
  let validationService: ValidationService;
  let validationPipe: ValidationPipe;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationService],
    }).compile();

    validationService = module.get<ValidationService>(ValidationService);
    validationPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  });

  describe('Coordinate Validation', () => {
    describe('Valid Coordinates', () => {
      const validCoordinates = [
        { lat: 0, lng: 0, description: 'Equator and Prime Meridian' },
        { lat: 27.7172, lng: 85.3240, description: 'Kathmandu, Nepal' },
        { lat: 40.7128, lng: -74.0060, description: 'New York City' },
        { lat: -33.8688, lng: 151.2093, description: 'Sydney, Australia' },
        { lat: 90, lng: 180, description: 'North Pole, International Date Line' },
        { lat: -90, lng: -180, description: 'South Pole, Opposite Date Line' },
        { lat: 51.5074, lng: -0.1278, description: 'London, UK' },
        { lat: 35.6762, lng: 139.6503, description: 'Tokyo, Japan' },
      ];

      test.each(validCoordinates)(
        'should accept valid coordinates: $description ($lat, $lng)',
        ({ lat, lng }) => {
          expect(() => {
            validationService.validateCoordinates(lat, lng);
          }).not.toThrow();
        }
      );
    });

    describe('Invalid Coordinates', () => {
      const invalidCoordinates = [
        { lat: 91, lng: 0, description: 'Latitude too high' },
        { lat: -91, lng: 0, description: 'Latitude too low' },
        { lat: 0, lng: 181, description: 'Longitude too high' },
        { lat: 0, lng: -181, description: 'Longitude too low' },
        { lat: 100, lng: 200, description: 'Both coordinates out of range' },
        { lat: NaN, lng: 0, description: 'NaN latitude' },
        { lat: 0, lng: NaN, description: 'NaN longitude' },
        { lat: Infinity, lng: 0, description: 'Infinite latitude' },
        { lat: 0, lng: -Infinity, description: 'Negative infinite longitude' },
      ];

      test.each(invalidCoordinates)(
        'should reject invalid coordinates: $description ($lat, $lng)',
        ({ lat, lng }) => {
          expect(() => {
            validationService.validateCoordinates(lat, lng);
          }).toThrow(GeospatialValidationException);
        }
      );
    });

    describe('Edge Cases', () => {
      it('should handle very precise coordinates', () => {
        expect(() => {
          validationService.validateCoordinates(27.717234567890123, 85.324056789012345);
        }).not.toThrow();
      });

      it('should handle coordinates at exact boundaries', () => {
        expect(() => {
          validationService.validateCoordinates(90, 180);
          validationService.validateCoordinates(-90, -180);
        }).not.toThrow();
      });
    });
  });

  describe('Radius Validation', () => {
    describe('Valid Radius Values', () => {
      const validRadii = [
        { radius: 10, description: 'Minimum allowed radius' },
        { radius: 50, description: 'Small office radius' },
        { radius: 100, description: 'Standard office radius' },
        { radius: 500, description: 'Large facility radius' },
        { radius: 1000, description: 'Maximum allowed radius' },
      ];

      test.each(validRadii)(
        'should accept valid radius: $description ($radius meters)',
        ({ radius }) => {
          expect(() => {
            validationService.validateRadius(radius);
          }).not.toThrow();
        }
      );
    });

    describe('Invalid Radius Values', () => {
      const invalidRadii = [
        { radius: 0, description: 'Zero radius' },
        { radius: 5, description: 'Below minimum radius' },
        { radius: 1001, description: 'Above maximum radius' },
        { radius: 1500, description: 'Way above maximum' },
        { radius: -10, description: 'Negative radius' },
        { radius: NaN, description: 'NaN radius' },
        { radius: Infinity, description: 'Infinite radius' },
      ];

      test.each(invalidRadii)(
        'should reject invalid radius: $description ($radius meters)',
        ({ radius }) => {
          expect(() => {
            validationService.validateRadius(radius);
          }).toThrow(GeospatialValidationException);
        }
      );
    });
  });

  describe('Location Within Radius Validation', () => {
    describe('Valid Location Scenarios', () => {
      const validScenarios = [
        { distance: 0, radius: 100, description: 'Exact location match' },
        { distance: 50, radius: 100, description: 'Well within radius' },
        { distance: 99, radius: 100, description: 'Just within radius' },
        { distance: 100, radius: 100, description: 'Exactly at radius boundary' },
      ];

      test.each(validScenarios)(
        'should accept location: $description (distance: $distance, radius: $radius)',
        ({ distance, radius }) => {
          expect(() => {
            validationService.validateLocationWithinRadius(distance, radius, 'Test Office');
          }).not.toThrow();
        }
      );
    });

    describe('Invalid Location Scenarios', () => {
      const invalidScenarios = [
        { distance: 101, radius: 100, description: 'Just outside radius' },
        { distance: 150, radius: 100, description: 'Clearly outside radius' },
        { distance: 500, radius: 100, description: 'Far outside radius' },
      ];

      test.each(invalidScenarios)(
        'should reject location: $description (distance: $distance, radius: $radius)',
        ({ distance, radius }) => {
          expect(() => {
            validationService.validateLocationWithinRadius(distance, radius, 'Test Office');
          }).toThrow(LocationValidationException);
        }
      );
    });

    it('should provide detailed error information for location validation failures', () => {
      try {
        validationService.validateLocationWithinRadius(150, 100, 'Main Office');
        fail('Expected LocationValidationException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LocationValidationException);
        const response = error.getResponse();
        expect(response.details.actualDistance).toBe(150);
        expect(response.details.requiredRadius).toBe(100);
        expect(response.details.entityName).toBe('Main Office');
        expect(response.message).toContain('150.00m away');
        expect(response.message).toContain('100m radius');
      }
    });
  });

  describe('Email Validation', () => {
    describe('Valid Email Formats', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company.com',
        'user123@test-domain.com',
        'email@subdomain.example.com',
        'user_name@example.com',
        'user-name@example-domain.com',
      ];

      test.each(validEmails)('should accept valid email: %s', (email) => {
        expect(() => {
          validationService.validateEmail(email);
        }).not.toThrow();
      });
    });

    describe('Invalid Email Formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user@.com',
        'user@com',
        '',
        'user name@example.com',
        'user@example',
        'user@example..com',
      ];

      test.each(invalidEmails)('should reject invalid email: %s', (email) => {
        expect(() => {
          validationService.validateEmail(email);
        }).toThrow();
      });
    });
  });

  describe('KahaId Validation', () => {
    describe('Valid KahaId Formats', () => {
      const validKahaIds = [
        'KTM-MAIN-001',
        'OFFICE123',
        'BRANCH_A',
        'LOC-001',
        'SITE-ALPHA-01',
        'FACILITY_1',
        'BUILDING-A1',
        'ZONE123',
      ];

      test.each(validKahaIds)('should accept valid KahaId: %s', (kahaId) => {
        expect(() => {
          validationService.validateKahaId(kahaId);
        }).not.toThrow();
      });
    });

    describe('Invalid KahaId Formats', () => {
      const invalidKahaIds = [
        '',
        'KTM@MAIN#001',
        'OFFICE 123',
        'BRANCH/A',
        'LOC.001',
        'SITE+ALPHA',
        'FACILITY%1',
        'BUILDING*A1',
        'a', // Too short
        'VERY-LONG-KAHA-ID-THAT-EXCEEDS-REASONABLE-LENGTH-LIMITS-FOR-IDENTIFIERS',
      ];

      test.each(invalidKahaIds)('should reject invalid KahaId: %s', (kahaId) => {
        expect(() => {
          validationService.validateKahaId(kahaId);
        }).toThrow();
      });
    });
  });

  describe('UUID Validation', () => {
    describe('Valid UUID Formats', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
      ];

      test.each(validUUIDs)('should accept valid UUID: %s', (uuid) => {
        expect(() => {
          validationService.validateUUID(uuid);
        }).not.toThrow();
      });
    });

    describe('Invalid UUID Formats', () => {
      const invalidUUIDs = [
        'invalid-uuid',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-426614174000-extra',
        '123e4567e89b12d3a456426614174000',
        '123e4567-e89b-12d3-a456-42661417400g',
        '',
        '123e4567-e89b-12d3-a456-42661417400',
        'g23e4567-e89b-12d3-a456-426614174000',
      ];

      test.each(invalidUUIDs)('should reject invalid UUID: %s', (uuid) => {
        expect(() => {
          validationService.validateUUID(uuid);
        }).toThrow();
      });
    });
  });

  describe('Business Logic Validation', () => {
    it('should create EntityAccessDeniedException with proper details', () => {
      const exception = new EntityAccessDeniedException(
        'user-123',
        'entity-456',
        'User has no department assigned'
      );

      expect(exception.getStatus()).toBe(403);
      const response = exception.getResponse() as any;
      expect(response.error).toBe('Entity Access Denied');
      expect(response.details.userId).toBe('user-123');
      expect(response.details.entityId).toBe('entity-456');
      expect(response.details.reason).toBe('User has no department assigned');
    });

    it('should handle complex validation scenarios', () => {
      // Test multiple validations in sequence
      expect(() => {
        validationService.validateCoordinates(27.7172, 85.3240);
        validationService.validateRadius(100);
        validationService.validateEmail('test@example.com');
        validationService.validateKahaId('KTM-MAIN-001');
        validationService.validateUUID('123e4567-e89b-12d3-a456-426614174000');
      }).not.toThrow();
    });

    it('should fail fast on first validation error', () => {
      expect(() => {
        validationService.validateCoordinates(91, 85.3240); // Invalid latitude
        validationService.validateRadius(100); // This should not be reached
      }).toThrow(GeospatialValidationException);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle high-precision floating point numbers', () => {
      expect(() => {
        validationService.validateCoordinates(
          27.717234567890123456789,
          85.324056789012345678901
        );
      }).not.toThrow();
    });

    it('should handle validation of many coordinates efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        const lat = (Math.random() * 180) - 90; // -90 to 90
        const lng = (Math.random() * 360) - 180; // -180 to 180
        
        try {
          validationService.validateCoordinates(lat, lng);
        } catch (error) {
          // Expected for some random coordinates
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 validations in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should maintain consistent error messages', () => {
      const errors: string[] = [];
      
      try {
        validationService.validateCoordinates(91, 0);
      } catch (error) {
        errors.push(error.message);
      }
      
      try {
        validationService.validateCoordinates(92, 0);
      } catch (error) {
        errors.push(error.message);
      }
      
      // Error messages should follow consistent format
      expect(errors[0]).toMatch(/latitude.*must be between/i);
      expect(errors[1]).toMatch(/latitude.*must be between/i);
    });
  });
});